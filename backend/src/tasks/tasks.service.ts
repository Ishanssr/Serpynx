import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';
import { WorkBreakdownService } from '../work-breakdown/work-breakdown.service';
import { WorkPartCreatorService } from './work-part-creator.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private workBreakdownService: WorkBreakdownService,
        private workPartCreatorService: WorkPartCreatorService,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Transform Prisma's capitalized relation names to frontend-expected lowercase names.
     * Prisma uses model names (User, Bid, Submission, Review, Team)
     * but frontend expects (client, bids, freelancer, submission, review, team).
     */
    private transformTask(task: any): any {
        if (!task) return task;
        const { User, Bid, Submission, Review, _count, ...rest } = task;
        return {
            ...rest,
            ...(User !== undefined && { client: User }),
            ...(Bid !== undefined && { bids: (Bid || []).map((b: any) => this.transformBid(b)) }),
            ...(Submission !== undefined && { submission: Submission }),
            ...(Review !== undefined && { review: Review }),
            ...(_count !== undefined && { _count: { bids: _count?.Bid ?? 0, ..._count } }),
        };
    }

    private transformBid(bid: any): any {
        if (!bid) return bid;
        const { User, Team, ...rest } = bid;
        return {
            ...rest,
            ...(User !== undefined && { freelancer: User }),
            ...(Team !== undefined && { team: Team }),
        };
    }

    async create(clientId: string, dto: CreateTaskDto) {
        // Create the task first
        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                budget: dto.budget,
                requiredSkills: dto.requiredSkills || [],
                clientId,
            },
            include: {
                User: { select: { id: true, name: true, email: true } },
            },
        });

        // Immediately create work breakdown using AI
        console.log('Creating work breakdown for task:', task.title);
        const workBreakdown = await this.workBreakdownService.breakDownWork(
            task.title,
            task.description,
            task.requiredSkills
        );

        console.log('Work breakdown generated:', workBreakdown);

        // Create work parts for the task
        console.log('Creating work parts for task:', task.id);
        await this.prisma.$transaction(
            workBreakdown.map(part =>
                this.prisma.workPart.create({
                    data: {
                        partNumber: part.partNumber,
                        title: part.title,
                        description: part.description,
                        taskId: task.id, // Link directly to task, not submission
                        order: part.partNumber, // Use partNumber as order
                    },
                })
            )
        );

        console.log('Work parts created successfully');

        return task;
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
                    User: { select: { id: true, name: true } },
                    _count: { select: { Bid: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks.map(t => this.transformTask(t)),
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
                User: { select: { id: true, name: true, email: true } },
                Bid: {
                    include: {
                        User: {
                            select: { id: true, name: true, skills: true, avgRating: true, totalReviews: true },
                        },
                        Team: { select: { id: true, name: true } },
                    },
                    orderBy: { smartScore: 'desc' },
                },
                Submission: true,
                Review: true,
            },
        });
        if (!task || task.deletedAt) throw new NotFoundException('Task not found');
        return this.transformTask(task);
    }

    async findByClient(clientId: string) {
        const tasks = await this.prisma.task.findMany({
            where: { clientId, deletedAt: null },
            include: {
                _count: { select: { Bid: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Fetch assigned freelancer names
        const assignedIds = tasks.map(t => t.assignedToId).filter(Boolean) as string[];
        const freelancers = assignedIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: assignedIds } },
                select: { id: true, name: true },
            })
            : [];
        const freelancerMap = new Map(freelancers.map(f => [f.id, f]));

        return tasks.map(t => ({
            ...this.transformTask(t),
            assignedTo: t.assignedToId ? freelancerMap.get(t.assignedToId) || null : null,
        }));
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

    async getWorkParts(taskId: string, userId: string) {
        // Check if user has access to this task
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            select: { clientId: true }
        });

        if (!task) throw new NotFoundException('Task not found');

        // Check if user is client or assigned freelancer
        const isClient = task.clientId === userId;
        const assignedBid = await this.prisma.bid.findFirst({
            where: {
                taskId,
                freelancerId: userId,
                status: 'ACCEPTED'
            }
        });
        const isAssignedFreelancer = !!assignedBid;

        if (!isClient && !isAssignedFreelancer) {
            throw new ForbiddenException('You are not authorized to view work parts for this task');
        }

        // Get work parts linked directly to task
        const workParts = await this.prisma.workPart.findMany({
            where: { taskId },
            include: {
                WorkFile: true,
            },
            orderBy: { partNumber: 'asc' }
        });

        return workParts;
    }

    async assignFreelancers(taskId: string, primaryBidId: string, standbyBidId?: string) {
        // Get the primary bid to find the freelancer
        const primaryBid = await this.prisma.bid.findUnique({
            where: { id: primaryBidId },
            include: { User: { select: { id: true, name: true } }, Task: { select: { title: true } } },
        });
        if (!primaryBid) throw new NotFoundException('Primary bid not found');

        // Update task: set status, assignedTo, primaryBidId, standbyBidId
        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'ASSIGNED',
                assignedToId: primaryBid.freelancerId,
                primaryBidId,
                standbyBidId: standbyBidId || null,
            },
        });

        // Update bid statuses
        // Primary bid → ACCEPTED
        await this.prisma.bid.update({ where: { id: primaryBidId }, data: { status: 'ACCEPTED' } });

        // Standby bid → STANDBY (if provided)
        if (standbyBidId) {
            await this.prisma.bid.update({ where: { id: standbyBidId }, data: { status: 'STANDBY' } });
        }

        // Reject all other bids
        await this.prisma.bid.updateMany({
            where: {
                taskId,
                id: { notIn: [primaryBidId, ...(standbyBidId ? [standbyBidId] : [])] },
                status: 'PENDING',
            },
            data: { status: 'REJECTED' },
        });

        // Create work parts
        await this.workPartCreatorService.createDefaultWorkParts(taskId);

        // Send notifications
        const taskTitle = primaryBid.Task?.title || 'a task';
        if (this.notificationsService) {
            this.notificationsService.notifyTaskAssigned(primaryBid.freelancerId, taskId, taskTitle)
                .catch(err => console.error('Notification error:', err));

            if (standbyBidId) {
                const standbyBid = await this.prisma.bid.findUnique({
                    where: { id: standbyBidId },
                    select: { freelancerId: true },
                });
                if (standbyBid) {
                    this.notificationsService.notifyStandbyAssigned(standbyBid.freelancerId, taskId, taskTitle)
                        .catch(err => console.error('Notification error:', err));
                }
            }
        }

        return { message: 'Freelancers assigned successfully', status: 'ASSIGNED' };
    }

    async handleTaskAssignment(taskId: string): Promise<void> {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.status === 'ASSIGNED') {
            await this.workPartCreatorService.createDefaultWorkParts(taskId);
        }
    }
}
