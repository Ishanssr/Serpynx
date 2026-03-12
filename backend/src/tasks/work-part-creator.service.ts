import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkPartStatus } from '@prisma/client';

@Injectable()
export class WorkPartCreatorService {
  constructor(private prisma: PrismaService) {}

  async createDefaultWorkParts(taskId: string): Promise<void> {
    // Check if work parts already exist for this task
    const existingParts = await this.prisma.workPart.findMany({
      where: { taskId }
    });

    // Only create default parts if none exist
    if (existingParts.length > 0) {
      return;
    }

    // Create 3 deterministic work parts
    const defaultWorkParts = [
      {
        taskId,
        title: 'Planning & Requirements',
        description: 'Understand the task and prepare approach',
        partNumber: 1,
        order: 1,
        status: WorkPartStatus.NOT_STARTED
      },
      {
        taskId,
        title: 'Implementation',
        description: 'Build the core solution',
        partNumber: 2,
        order: 2,
        status: WorkPartStatus.NOT_STARTED
      },
      {
        taskId,
        title: 'Testing & Final Delivery',
        description: 'Testing and delivering final result',
        partNumber: 3,
        order: 3,
        status: WorkPartStatus.NOT_STARTED
      }
    ];

    // Create all work parts in a single transaction
    await this.prisma.workPart.createMany({
      data: defaultWorkParts
    });
  }
}
