import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkBreakdownService } from '../work-breakdown/work-breakdown.service';
import { CreateSubmissionDto, UpdateWorkPartDto, CreateWorkBreakdownDto, ReviewWorkPartDto } from './submissions-enhanced.dto';

@Injectable()
export class SubmissionsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private workBreakdownService: WorkBreakdownService,
    ) { }

    async submitWork(taskId: string, freelancerId: string, dto: CreateSubmissionDto) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.assignedToId !== freelancerId) {
            throw new ForbiddenException('You are not assigned to this task');
        }
        if (task.status !== 'ASSIGNED') {
            throw new BadRequestException('Task is not in assigned status');
        }

        const existing = await this.prisma.submission.findUnique({ where: { taskId } });
        if (existing) throw new BadRequestException('Work already submitted for this task');

        const freelancer = await this.prisma.user.findUnique({
            where: { id: freelancerId },
            select: { name: true },
        });

        const submission = await this.prisma.submission.create({
            data: {
                content: dto.content,
                link: dto.link,
                freelancerId,
                taskId,
            },
        });

        // Auto-generate work breakdown
        const workBreakdown = await this.workBreakdownService.breakDownWork(
            task.title,
            task.description,
            task.requiredSkills
        );

        // Create work parts
        for (const part of workBreakdown) {
            await this.prisma.workPart.create({
                data: {
                    partNumber: part.partNumber,
                    title: part.title,
                    description: part.description,
                    submissionId: submission.id,
                },
            });
        }

        await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'IN_REVIEW' },
        });

        // Notify the client that work was submitted
        await this.notificationsService.notifyWorkSubmitted(
            task.clientId, freelancer?.name || 'A freelancer', taskId, task.title,
        );

        return submission;
    }

    async getSubmission(taskId: string) {
        const submission = await this.prisma.submission.findUnique({
            where: { taskId },
            include: {
                freelancer: { select: { id: true, name: true } },
                workParts: {
                    include: {
                        files: true,
                    },
                    orderBy: { partNumber: 'asc' },
                },
            },
        });
        if (!submission) throw new NotFoundException('No submission found');
        return submission;
    }

    async updateWorkPart(workPartId: string, freelancerId: string, dto: UpdateWorkPartDto) {
        const workPart = await this.prisma.workPart.findUnique({
            where: { id: workPartId },
            include: {
                submission: {
                    include: { task: true },
                },
            },
        });

        if (!workPart) throw new NotFoundException('Work part not found');
        if (workPart.submission.freelancerId !== freelancerId) {
            throw new ForbiddenException('You are not assigned to this task');
        }
        if (workPart.submission.task.status !== 'ASSIGNED') {
            throw new BadRequestException('Task is not in assigned status');
        }

        const updateData: any = {
            status: dto.status,
        };

        if (dto.content) {
            updateData.content = dto.content;
        }

        if (dto.status === 'SUBMITTED') {
            updateData.submittedAt = new Date();
        }

        const updatedWorkPart = await this.prisma.workPart.update({
            where: { id: workPartId },
            data: updateData,
            include: {
                files: true,
            },
        });

        // Check if all parts are submitted to update task status
        const allParts = await this.prisma.workPart.findMany({
            where: { submissionId: workPart.submissionId },
        });

        const allSubmitted = allParts.every(part => part.status === 'SUBMITTED' || part.status === 'APPROVED');

        if (allSubmitted) {
            await this.prisma.task.update({
                where: { id: workPart.submission.taskId },
                data: { status: 'IN_REVIEW' },
            });

            // Notify client that all work parts are submitted
            await this.notificationsService.notifyWorkSubmitted(
                workPart.submission.task.clientId,
                'Freelancer',
                workPart.submission.taskId,
                workPart.submission.task.title,
            );
        }

        return updatedWorkPart;
    }

    async reviewWorkPart(workPartId: string, clientId: string, dto: ReviewWorkPartDto) {
        const workPart = await this.prisma.workPart.findUnique({
            where: { id: workPartId },
            include: {
                submission: {
                    include: { task: true },
                },
            },
        });

        if (!workPart) throw new NotFoundException('Work part not found');
        if (workPart.submission.task.clientId !== clientId) {
            throw new ForbiddenException('You are not the client for this task');
        }

        const updateData: any = {
            status: dto.status,
            reviewedAt: new Date(),
        };

        if (dto.feedback) {
            updateData.feedback = dto.feedback;
        }

        const updatedWorkPart = await this.prisma.workPart.update({
            where: { id: workPartId },
            data: updateData,
            include: {
                files: true,
            },
        });

        // Check if all parts are approved to complete the task
        if (dto.status === 'APPROVED') {
            const allParts = await this.prisma.workPart.findMany({
                where: { submissionId: workPart.submissionId },
            });

            const allApproved = allParts.every(part => part.status === 'APPROVED');

            if (allApproved) {
                await this.prisma.task.update({
                    where: { id: workPart.submission.taskId },
                    data: { status: 'COMPLETED' },
                });
            }
        }

        return updatedWorkPart;
    }

    async getWorkParts(taskId: string, userId: string) {
        const submission = await this.prisma.submission.findUnique({
            where: { taskId },
            include: {
                task: true,
                workParts: {
                    include: {
                        files: true,
                    },
                    orderBy: { partNumber: 'asc' },
                },
            },
        });

        if (!submission) throw new NotFoundException('No submission found');

        // Check if user is either the client or the freelancer
        const isClient = submission.task.clientId === userId;
        const isFreelancer = submission.freelancerId === userId;

        if (!isClient && !isFreelancer) {
            throw new ForbiddenException('You are not authorized to view this submission');
        }

        return submission.workParts;
    }
}
