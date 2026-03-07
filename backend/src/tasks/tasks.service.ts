import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';

@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    async create(clientId: string, dto: CreateTaskDto) {
        return this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                budget: dto.budget,
                requiredSkills: dto.requiredSkills || [],
                clientId,
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
            },
        });
    }

    async findAll(query: TaskQueryDto) {
        const { search, status, skill, minBudget, maxBudget, page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: any = { deletedAt: null };

        if (status) {
            where.status = status;
        }
        if (skill) {
            where.requiredSkills = { has: skill };
        }
        if (minBudget !== undefined || maxBudget !== undefined) {
            where.budget = {};
            if (minBudget !== undefined) where.budget.gte = minBudget;
            if (maxBudget !== undefined) where.budget.lte = maxBudget;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [tasks, total] = await this.prisma.$transaction([
            this.prisma.task.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true } },
                    _count: { select: { bids: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, name: true, email: true } },
                bids: {
                    include: {
                        freelancer: {
                            select: { id: true, name: true, skills: true, avgRating: true, totalReviews: true },
                        },
                        team: { select: { id: true, name: true } },
                    },
                    orderBy: { smartScore: 'desc' },
                },
                submission: true,
                review: true,
            },
        });
        if (!task || task.deletedAt) throw new NotFoundException('Task not found');
        return task;
    }

    async findByClient(clientId: string) {
        return this.prisma.task.findMany({
            where: { clientId, deletedAt: null },
            include: {
                _count: { select: { bids: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(id: string, clientId: string, dto: UpdateTaskDto) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== clientId) throw new ForbiddenException('Not your task');

        return this.prisma.task.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string, clientId: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== clientId) throw new ForbiddenException('Not your task');
        if (task.status !== 'OPEN') throw new ForbiddenException('Cannot delete a non-open task');

        // Soft delete
        return this.prisma.task.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
