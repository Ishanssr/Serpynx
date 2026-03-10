import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkPartStatus, SubmissionStatus, ActivityAction } from '@prisma/client';

@Injectable()
export class WorkSubmissionService {
  constructor(private prisma: PrismaService) {}

  async submitWork(workPartId: string, submittedBy: string, description: string) {
    // Check if work part exists and user has permission
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { task: true }
    });

    if (!workPart || !workPart.task) {
      throw new NotFoundException('Work part not found');
    }

    if (workPart.task.assignedToId !== submittedBy) {
      throw new ForbiddenException('Only assigned freelancer can submit work');
    }

    // Create submission
    const submission = await this.prisma.workSubmission.create({
      data: {
        workPartId,
        submittedBy,
        description,
        status: SubmissionStatus.SUBMITTED
      }
    });

    // Update work part status
    await this.prisma.workPart.update({
      where: { id: workPartId },
      data: {
        status: WorkPartStatus.SUBMITTED,
        submittedAt: new Date()
      }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId: workPart.taskId,
        actorId: submittedBy,
        action: ActivityAction.WORK_SUBMITTED,
        metadata: {
          workPartId,
          submissionId: submission.id
        }
      }
    });

    return submission;
  }

  async approveSubmission(submissionId: string, reviewerId: string, comment?: string) {
    const submission = await this.prisma.workSubmission.findUnique({
      where: { id: submissionId },
      include: { workPart: { include: { task: true } } }
    });

    if (!submission || !submission.workPart || !submission.workPart.task) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.workPart.task.clientId !== reviewerId) {
      throw new ForbiddenException('Only client can approve submission');
    }

    // Update submission
    const updatedSubmission = await this.prisma.workSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.APPROVED,
        reviewedAt: new Date(),
        reviewComment: comment
      }
    });

    // Update work part status
    await this.prisma.workPart.update({
      where: { id: submission.workPartId },
      data: {
        status: WorkPartStatus.APPROVED,
        reviewedAt: new Date()
      }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId: submission.workPart.taskId,
        actorId: reviewerId,
        action: ActivityAction.WORK_APPROVED,
        metadata: {
          workPartId: submission.workPartId,
          submissionId: submissionId
        }
      }
    });

    return updatedSubmission;
  }

  async requestRevision(submissionId: string, reviewerId: string, comment: string) {
    const submission = await this.prisma.workSubmission.findUnique({
      where: { id: submissionId },
      include: { workPart: { include: { task: true } } }
    });

    if (!submission || !submission.workPart || !submission.workPart.task) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.workPart.task.clientId !== reviewerId) {
      throw new ForbiddenException('Only client can request revision');
    }

    // Update submission
    const updatedSubmission = await this.prisma.workSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.REVISION_REQUESTED,
        reviewedAt: new Date(),
        reviewComment: comment
      }
    });

    // Update work part status and feedback
    await this.prisma.workPart.update({
      where: { id: submission.workPartId },
      data: {
        status: WorkPartStatus.REVISION_REQUIRED,
        reviewedAt: new Date(),
        feedback: comment
      }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId: submission.workPart.taskId,
        actorId: reviewerId,
        action: ActivityAction.REVISION_REQUESTED,
        metadata: {
          workPartId: submission.workPartId,
          submissionId: submissionId
        }
      }
    });

    return updatedSubmission;
  }

  async getSubmissionsForWorkPart(workPartId: string) {
    return this.prisma.workSubmission.findMany({
      where: { workPartId },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
