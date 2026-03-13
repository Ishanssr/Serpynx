import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/users')
export class UsersController {
    constructor(private prisma: PrismaService) {}

    @Get('freelancers')
    async searchFreelancers(
        @Query('page') page = '1',
        @Query('limit') limit = '12',
        @Query('search') search?: string,
        @Query('sort') sort = 'avgRating',
    ) {
        const take = Math.min(Number(limit) || 12, 50);
        const skip = ((Number(page) || 1) - 1) * take;

        const where: any = { role: 'FREELANCER', deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { bio: { contains: search, mode: 'insensitive' } },
                { skills: { hasSome: [search] } },
            ];
        }

        const orderBy: any = {};
        if (sort === 'avgRating') orderBy.avgRating = 'desc';
        else if (sort === 'totalReviews') orderBy.totalReviews = 'desc';
        else orderBy.createdAt = 'desc';

        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    bio: true,
                    skills: true,
                    avgRating: true,
                    totalReviews: true,
                    avatarUrl: true,
                    createdAt: true,
                },
                orderBy,
                skip,
                take,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: { total, page: Number(page), limit: take, totalPages: Math.ceil(total / take) },
        };
    }

    @Get(':id')
    async getPublicProfile(@Param('id') id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                bio: true,
                skills: true,
                role: true,
                avgRating: true,
                totalReviews: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new Error('User not found');
        }

        // Compute stats based on role
        let stats: any = {};
        if (user.role === 'FREELANCER') {
            const [completedTasks, activeBids, totalEarned, recentWork] = await Promise.all([
                this.prisma.bid.count({ where: { freelancerId: id, status: 'ACCEPTED', Task: { status: 'COMPLETED' } } }),
                this.prisma.bid.count({ where: { freelancerId: id, status: 'PENDING' } }),
                this.prisma.bid.aggregate({ where: { freelancerId: id, status: 'ACCEPTED', Task: { status: 'COMPLETED' } }, _sum: { amount: true } }),
                this.prisma.task.findMany({
                    where: { Bid: { some: { freelancerId: id, status: 'ACCEPTED' } }, status: 'COMPLETED' },
                    select: { id: true, title: true, budget: true, Review: { select: { rating: true } } },
                    orderBy: { updatedAt: 'desc' },
                    take: 5,
                }),
            ]);
            stats = {
                completedTasks,
                activeBids,
                totalEarned: totalEarned._sum.amount || 0,
                recentWork: recentWork.map(w => ({ ...w, review: w.Review || null, Review: undefined })),
            };
        } else {
            const [totalTasks, openTasks, completedTasks, totalSpent] = await Promise.all([
                this.prisma.task.count({ where: { clientId: id, deletedAt: null } }),
                this.prisma.task.count({ where: { clientId: id, status: 'OPEN', deletedAt: null } }),
                this.prisma.task.count({ where: { clientId: id, status: 'COMPLETED', deletedAt: null } }),
                this.prisma.task.aggregate({ where: { clientId: id, status: 'COMPLETED', deletedAt: null }, _sum: { budget: true } }),
            ]);
            stats = {
                totalTasks,
                openTasks,
                completedTasks,
                totalSpent: totalSpent._sum.budget || 0,
            };
        }

        return { ...user, stats };
    }
}
