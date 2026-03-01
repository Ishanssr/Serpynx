import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { CreateBidDto } from './bids.dto';

@Injectable()
export class BidsService {
    constructor(
        private prisma: PrismaService,
        private matchingService: MatchingService,
    ) { }

    async createBid(taskId: string, freelancerId: string, dto: CreateBidDto) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.status !== 'OPEN') throw new BadRequestException('Task is not open for bids');
        if (task.clientId === freelancerId) throw new ForbiddenException('Cannot bid on your own task');

        // Check if already bid
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

        // Compute smart score
        const score = await this.matchingService.computeAndStoreBidScore(bid.id);

        return { ...bid, smartScore: score };
    }

    async getTaskBids(taskId: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        const bids = await this.prisma.bid.findMany({
            where: { taskId },
            include: {
                freelancer: {
                    select: { id: true, name: true, skills: true, avgRating: true, totalReviews: true },
                },
            },
            orderBy: { smartScore: 'desc' },
        });

        // Flag the top bid as recommended
        return bids.map((bid, index) => ({
            ...bid,
            recommended: index === 0 && bids.length > 1,
        }));
    }

    async acceptBid(bidId: string, clientId: string) {
        const bid = await this.prisma.bid.findUnique({
            where: { id: bidId },
            include: { task: true },
        });
        if (!bid) throw new NotFoundException('Bid not found');
        if (bid.task.clientId !== clientId) throw new ForbiddenException('Not your task');
        if (bid.task.status !== 'OPEN') throw new BadRequestException('Task is not open');

        // Accept this bid, reject all others, update task status
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

        return { message: 'Bid accepted, task assigned', bidId, taskId: bid.taskId };
    }

    async getFreelancerBids(freelancerId: string) {
        return this.prisma.bid.findMany({
            where: { freelancerId },
            include: {
                task: {
                    select: { id: true, title: true, budget: true, status: true, requiredSkills: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
