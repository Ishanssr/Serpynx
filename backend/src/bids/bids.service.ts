import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBidDto } from './bids.dto';

@Injectable()
export class BidsService {
    constructor(
        private prisma: PrismaService,
        private matchingService: MatchingService,
        private notificationsService: NotificationsService,
    ) { }

    async createBid(taskId: string, freelancerId: string, dto: CreateBidDto) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.status !== 'OPEN') throw new BadRequestException('Task is not open for bids');
        if (task.clientId === freelancerId) throw new ForbiddenException('Cannot bid on your own task');

        const existingBid = await this.prisma.bid.findUnique({
            where: { freelancerId_taskId: { freelancerId, taskId } },
        });
        if (existingBid) throw new ConflictException('You already bid on this task');

        const bid = await this.prisma.bid.create({
            data: {
                amount: dto.amount,
                coverLetter: dto.coverLetter,
                estimatedDays: dto.estimatedDays,
                freelancerId,
                taskId,
                ...(dto.teamId && { teamId: dto.teamId }),
            },
            include: {
                freelancer: { select: { id: true, name: true, skills: true, avgRating: true } },
            },
        });

        const score = await this.matchingService.computeAndStoreBidScore(bid.id);

        // Notify the client that a new bid was received
        await this.notificationsService.notifyBidReceived(
            task.clientId, bid.freelancer.name, taskId, task.title,
        );

        return { ...bid, smartScore: score };
    }

    async getTaskBids(taskId: string, page = 1, limit = 20) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        const skip = (page - 1) * limit;

        const [bids, total] = await this.prisma.$transaction([
            this.prisma.bid.findMany({
                where: { taskId },
                include: {
                    freelancer: {
                        select: { id: true, name: true, skills: true, avgRating: true, totalReviews: true },
                    },
                    team: { select: { id: true, name: true } },
                },
                orderBy: { smartScore: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.bid.count({ where: { taskId } }),
        ]);

        const data = bids.map((bid, index) => ({
            ...bid,
            recommended: index === 0 && skip === 0 && bids.length > 1,
        }));

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async acceptBid(bidId: string, clientId: string) {
        const bid = await this.prisma.bid.findUnique({
            where: { id: bidId },
            include: { task: true },
        });
        if (!bid) throw new NotFoundException('Bid not found');
        if (bid.task.clientId !== clientId) throw new ForbiddenException('Not your task');
        if (bid.task.status !== 'OPEN') throw new BadRequestException('Task is not open');

        // Get all other bidders so we can notify them of rejection
        const otherBids = await this.prisma.bid.findMany({
            where: { taskId: bid.taskId, id: { not: bidId } },
            select: { freelancerId: true },
        });

        await this.prisma.$transaction([
            this.prisma.bid.update({
                where: { id: bidId },
                data: { status: 'ACCEPTED' },
            }),
            this.prisma.bid.updateMany({
                where: { taskId: bid.taskId, id: { not: bidId } },
                data: { status: 'REJECTED' },
            }),
            this.prisma.task.update({
                where: { id: bid.taskId },
                data: {
                    status: 'ASSIGNED',
                    assignedToId: bid.freelancerId,
                    primaryBidId: bid.id,
                    standbyBidId: null,
                },
            }),
        ]);

        // Notify the winning freelancer
        await this.notificationsService.notifyBidAccepted(
            bid.freelancerId, bid.taskId, bid.task.title,
        );
        await this.notificationsService.notifyTaskAssigned(
            bid.freelancerId, bid.taskId, bid.task.title,
        );

        // Notify rejected bidders
        for (const other of otherBids) {
            await this.notificationsService.notifyBidRejected(
                other.freelancerId, bid.taskId, bid.task.title,
            );
        }

        return { message: 'Bid accepted, task assigned', bidId, taskId: bid.taskId };
    }

    /**
     * Assign a primary and optional standby freelancer for a task.
     * Uses smart-score-ranked bids; all non-selected bids are rejected.
     */
    async assignPrimaryAndStandby(taskId: string, clientId: string, primaryBidId: string, standbyBidId?: string) {
        if (standbyBidId && standbyBidId === primaryBidId) {
            throw new BadRequestException('Primary and standby freelancers must be different');
        }

        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { bids: true },
        });
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== clientId) throw new ForbiddenException('Not your task');
        if (task.status !== 'OPEN') throw new BadRequestException('Task is not open');

        const primaryBid = task.bids.find(b => b.id === primaryBidId);
        if (!primaryBid) throw new NotFoundException('Primary bid not found for this task');

        let standbyBid = null;
        if (standbyBidId) {
            standbyBid = task.bids.find(b => b.id === standbyBidId);
            if (!standbyBid) throw new NotFoundException('Standby bid not found for this task');
        }

        const rejectIds = task.bids
            .filter(b => b.id !== primaryBidId && (!standbyBidId || b.id !== standbyBidId))
            .map(b => b.id);

        await this.prisma.$transaction([
            this.prisma.bid.update({
                where: { id: primaryBidId },
                data: { status: 'ACCEPTED' },
            }),
            ...(standbyBidId ? [
                this.prisma.bid.update({
                    where: { id: standbyBidId },
                    data: { status: 'STANDBY' },
                }),
            ] : []),
            ...(rejectIds.length > 0 ? [
                this.prisma.bid.updateMany({
                    where: { id: { in: rejectIds } },
                    data: { status: 'REJECTED' },
                }),
            ] : []),
            this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: 'ASSIGNED',
                    assignedToId: primaryBid.freelancerId,
                    primaryBidId,
                    standbyBidId: standbyBidId || null,
                },
            }),
        ]);

        // Notify primary
        await this.notificationsService.notifyBidAccepted(
            primaryBid.freelancerId, taskId, task.title,
        );
        await this.notificationsService.notifyTaskAssigned(
            primaryBid.freelancerId, taskId, task.title,
        );

        // Notify standby, if any
        if (standbyBid) {
            await this.notificationsService.notifyStandbyAssigned(
                standbyBid.freelancerId, taskId, task.title,
            );
        }

        // Notify rejected bidders
        for (const bid of task.bids) {
            if (bid.id === primaryBidId || (standbyBidId && bid.id === standbyBidId)) continue;
            await this.notificationsService.notifyBidRejected(
                bid.freelancerId, taskId, task.title,
            );
        }

        return {
            message: 'Primary and standby freelancers assigned',
            taskId,
            primaryBidId,
            standbyBidId: standbyBidId || null,
        };
    }

    /**
     * Promote the standby freelancer to primary if the current assignee underperforms.
     * This is a manual trigger by the client and reassigns the task without re-opening bids.
     */
    async promoteStandby(taskId: string, clientId: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { bids: true },
        });
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== clientId) throw new ForbiddenException('Not your task');
        if (task.status !== 'ASSIGNED') throw new BadRequestException('Task is not currently assigned');

        const primaryBid = task.bids.find(b => b.status === 'ACCEPTED');
        const standbyBid = task.bids.find(b => b.status === 'STANDBY');

        if (!standbyBid) {
            throw new BadRequestException('No standby freelancer configured for this task');
        }
        if (!primaryBid) {
            throw new BadRequestException('No primary freelancer found for this task');
        }

        await this.prisma.$transaction([
            this.prisma.bid.update({
                where: { id: primaryBid.id },
                data: { status: 'REJECTED' },
            }),
            this.prisma.bid.update({
                where: { id: standbyBid.id },
                data: { status: 'ACCEPTED' },
            }),
            this.prisma.task.update({
                where: { id: taskId },
                data: {
                    assignedToId: standbyBid.freelancerId,
                    primaryBidId: standbyBid.id,
                    standbyBidId: null,
                },
            }),
        ]);

        await this.notificationsService.notifyStandbyPromoted(
            standbyBid.freelancerId, taskId, task.title,
        );

        return {
            message: 'Standby freelancer promoted to primary',
            taskId,
            newPrimaryBidId: standbyBid.id,
        };
    }

    async getFreelancerBids(freelancerId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [bids, total] = await this.prisma.$transaction([
            this.prisma.bid.findMany({
                where: { freelancerId },
                include: {
                    task: {
                        select: { id: true, title: true, budget: true, status: true, requiredSkills: true },
                    },
                    team: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.bid.count({ where: { freelancerId } }),
        ]);

        return {
            data: bids,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
}
