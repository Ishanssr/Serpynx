import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkPartStatus, ActivityAction } from '@prisma/client';

@Injectable()
export class WorkPartsService {
  constructor(private prisma: PrismaService) {}

  async createWorkPart(taskId: string, title: string, description: string, order: number, createdBy: string) {
    // Check if user has permission (client or assigned freelancer)
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.clientId !== createdBy && task.assignedToId !== createdBy) {
      throw new ForbiddenException('Only client or assigned freelancer can create work parts');
    }

    const workPart = await this.prisma.workPart.create({
      data: {
        taskId,
        title,
        description,
        order,
        status: WorkPartStatus.NOT_STARTED
      }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId,
        actorId: createdBy,
        action: ActivityAction.MILESTONE_CREATED,
        metadata: {
          workPartId: workPart.id,
          title,
          order
        }
      }
    });

    return workPart;
  }

  async updateWorkPart(workPartId: string, updates: any, updatedBy: string) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { task: true }
    });

    if (!workPart || !workPart.task) {
      throw new NotFoundException('Work part not found');
    }

    if (workPart.task.clientId !== updatedBy && workPart.task.assignedToId !== updatedBy) {
      throw new ForbiddenException('Only client or assigned freelancer can update work parts');
    }

    const updatedWorkPart = await this.prisma.workPart.update({
      where: { id: workPartId },
      data: updates
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId: workPart.taskId,
        actorId: updatedBy,
        action: ActivityAction.MILESTONE_UPDATED,
        metadata: {
          workPartId,
          updates
        }
      }
    });

    return updatedWorkPart;
  }

  async updateWorkPartStatus(workPartId: string, status: WorkPartStatus, updatedBy: string) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { task: true }
    });

    if (!workPart || !workPart.task) {
      throw new NotFoundException('Work part not found');
    }

    // Only assigned freelancer can update status to IN_PROGRESS or SUBMITTED
    if (workPart.task.assignedToId !== updatedBy) {
      throw new ForbiddenException('Only assigned freelancer can update work part status');
    }

    const updatedWorkPart = await this.prisma.workPart.update({
      where: { id: workPartId },
      data: {
        status,
        ...(status === WorkPartStatus.SUBMITTED && { submittedAt: new Date() })
      }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        taskId: workPart.taskId,
        actorId: updatedBy,
        action: ActivityAction.MILESTONE_COMPLETED,
        metadata: {
          workPartId,
          status
        }
      }
    });

    return updatedWorkPart;
  }

  async deleteWorkPart(workPartId: string, deletedBy: string) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { task: true }
    });

    if (!workPart || !workPart.task) {
      throw new NotFoundException('Work part not found');
    }

    // Only client can delete work parts
    if (workPart.task.clientId !== deletedBy) {
      throw new ForbiddenException('Only client can delete work parts');
    }

    await this.prisma.workPart.delete({
      where: { id: workPartId }
    });

    return { success: true };
  }

  async getWorkPartsForTask(taskId: string, userId: string) {
    // Check if user has access to the task
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.clientId !== userId && task.assignedToId !== userId) {
      throw new ForbiddenException('Only client or assigned freelancer can view work parts');
    }

    return this.prisma.workPart.findMany({
      where: { taskId },
      orderBy: { order: 'asc' }
    });
  }
}
