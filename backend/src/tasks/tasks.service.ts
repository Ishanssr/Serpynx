import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';

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

    async findAll(filters?: { status?: string; skill?: string }) {
        const where: any = {};
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.skill) {
            where.requiredSkills = { has: filters.skill };
        }

        return this.prisma.task.findMany({
            where,
            include: {
                client: { select: { id: true, name: true } },
                _count: { select: { bids: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
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
                    },
                    orderBy: { smartScore: 'desc' },
                },
                submission: true,
                review: true,
            },
        });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    async findByClient(clientId: string) {
        return this.prisma.task.findMany({
            where: { clientId },
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

        return this.prisma.task.delete({ where: { id } });
    }
}
