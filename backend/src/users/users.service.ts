import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get a public user profile with stats and work history
     */
    async getPublicProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                name: true,
                role: true,
                skills: true,
                bio: true,
                avgRating: true,
                totalReviews: true,
                createdAt: true,
            },
        });
        if (!user) throw new NotFoundException('User not found');

        // Get stats based on role
        let stats: any = {};

        if (user.role === 'FREELANCER') {
            const [completedTasks, activeBids, totalEarnings] = await this.prisma.$transaction([
                this.prisma.task.count({
                    where: { assignedToId: userId, status: 'COMPLETED' },
                }),
                this.prisma.bid.count({
                    where: { freelancerId: userId, status: 'PENDING' },
                }),
                this.prisma.bid.aggregate({
                    where: { freelancerId: userId, status: 'ACCEPTED' },
                    _sum: { amount: true },
                }),
            ]);
            stats = {
                completedTasks,
                activeBids,
                totalEarned: totalEarnings._sum.amount || 0,
            };

            // Recent completed work
            const recentWork = await this.prisma.task.findMany({
                where: { assignedToId: userId, status: 'COMPLETED' },
                select: {
                    id: true,
                    title: true,
                    budget: true,
                    updatedAt: true,
                    review: {
                        select: { rating: true, comment: true },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: 5,
            });
            stats.recentWork = recentWork;
        } else {
            // CLIENT stats
            const [totalTasks, openTasks, completedTasks, totalSpent] = await this.prisma.$transaction([
                this.prisma.task.count({ where: { clientId: userId, deletedAt: null } }),
                this.prisma.task.count({ where: { clientId: userId, status: 'OPEN' } }),
                this.prisma.task.count({ where: { clientId: userId, status: 'COMPLETED' } }),
                this.prisma.task.aggregate({
                    where: { clientId: userId, status: 'COMPLETED' },
                    _sum: { budget: true },
                }),
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

    /**
     * Search/browse freelancers with filters and pagination
     */
    async searchFreelancers(query: {
        search?: string;
        skill?: string;
        minRating?: number;
        sortBy?: string;
        page?: number;
        limit?: number;
    }) {
        const { search, skill, minRating, sortBy = 'avgRating', page = 1, limit = 12 } = query;
        const where: any = { role: 'FREELANCER', deletedAt: null };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { bio: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (skill) {
            where.skills = { has: skill };
        }
        if (minRating) {
            where.avgRating = { gte: minRating };
        }

        const skip = (page - 1) * limit;

        const orderBy: any = sortBy === 'reviews'
            ? { totalReviews: 'desc' as const }
            : sortBy === 'newest'
                ? { createdAt: 'desc' as const }
                : { avgRating: 'desc' as const };

        const [freelancers, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    skills: true,
                    bio: true,
                    avgRating: true,
                    totalReviews: true,
                    createdAt: true,
                    _count: {
                        select: {
                            bids: { where: { status: 'ACCEPTED' } },
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: freelancers.map((f) => ({
                ...f,
                completedJobs: f._count.bids,
                _count: undefined,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
}
