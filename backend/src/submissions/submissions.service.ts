import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './submissions.dto';

@Injectable()
export class SubmissionsService {
    constructor(private prisma: PrismaService) { }

    async submitWork(taskId: string, freelancerId: string, dto: CreateSubmissionDto) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.assignedToId !== freelancerId) {
            throw new ForbiddenException('You are not assigned to this task');
        }
        if (task.status !== 'ASSIGNED') {
            throw new BadRequestException('Task is not in assigned status');
        }

        // Check if already submitted
        const existing = await this.prisma.submission.findUnique({ where: { taskId } });
        if (existing) throw new BadRequestException('Work already submitted for this task');

        const submission = await this.prisma.submission.create({
            data: {
                content: dto.content,
                link: dto.link,
                freelancerId,
                taskId,
            },
        });

        // Update task status to IN_REVIEW
        await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'IN_REVIEW' },
        });

        return submission;
    }

    async getSubmission(taskId: string) {
        const submission = await this.prisma.submission.findUnique({
            where: { taskId },
            include: {
                freelancer: { select: { id: true, name: true } },
            },
        });
        if (!submission) throw new NotFoundException('No submission found');
        return submission;
    }
}
