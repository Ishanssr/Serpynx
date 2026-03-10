import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(taskId: string, senderId: string, message: string) {
    // Check if user has access to the task
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.clientId !== senderId && task.assignedToId !== senderId) {
      throw new ForbiddenException('Only client or assigned freelancer can send messages');
    }

    const projectMessage = await this.prisma.projectMessage.create({
      data: {
        taskId,
        senderId,
        message
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    return projectMessage;
  }

  async getMessages(taskId: string, userId: string) {
    // Check if user has access to the task
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.clientId !== userId && task.assignedToId !== userId) {
      throw new ForbiddenException('Only client or assigned freelancer can view messages');
    }

    return this.prisma.projectMessage.findMany({
      where: { taskId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
