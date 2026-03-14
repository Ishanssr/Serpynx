import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkPartStatus } from '@prisma/client';

@Injectable()
export class WorkPartsService {
  constructor(private prisma: PrismaService) {}

  async getWorkPartsForTask(taskId: string, userId: string) {
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
      orderBy: { partNumber: 'asc' }
    });
  }

  async updateWorkPart(workPartId: string, userId: string, data: { status?: string; content?: string }) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { Task: true },
    });

    if (!workPart) throw new NotFoundException('Work part not found');
    if (!workPart.Task) throw new NotFoundException('Associated task not found');

    // Only the assigned freelancer can update work parts
    if (workPart.Task.assignedToId !== userId) {
      throw new ForbiddenException('Only the assigned freelancer can update work parts');
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status as WorkPartStatus;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status === 'SUBMITTED') updateData.submittedAt = new Date();

    return this.prisma.workPart.update({
      where: { id: workPartId },
      data: updateData,
    });
  }

  async reviewWorkPart(workPartId: string, userId: string, data: { status: string; feedback?: string }) {
    const workPart = await this.prisma.workPart.findUnique({
      where: { id: workPartId },
      include: { Task: true },
    });

    if (!workPart) throw new NotFoundException('Work part not found');
    if (!workPart.Task) throw new NotFoundException('Associated task not found');

    // Only the client can review work parts
    if (workPart.Task.clientId !== userId) {
      throw new ForbiddenException('Only the client can review work parts');
    }

    return this.prisma.workPart.update({
      where: { id: workPartId },
      data: {
        status: data.status as WorkPartStatus,
        feedback: data.feedback || null,
        reviewedAt: new Date(),
      },
    });
  }
}
