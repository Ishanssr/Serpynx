import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkPartsService {
  constructor(private prisma: PrismaService) {}

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
      orderBy: { partNumber: 'asc' }
    });
  }
}
