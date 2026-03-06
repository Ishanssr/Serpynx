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
                data: { status: 'ASSIGNED', assignedToId: bid.freelancerId },
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

    async getFreelancerBids(freelancerId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [bids, total] = await this.prisma.$transaction([
            this.prisma.bid.findMany({
                where: { freelancerId },
                include: {
                    task: {
                        select: { id: true, title: true, budget: true, status: true, requiredSkills: true },
                    },
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
