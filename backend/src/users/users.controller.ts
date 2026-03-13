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
        return user;
    }
}
