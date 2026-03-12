import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBidDto } from './bids.dto';

@Injectable()
export class BidsService {
  constructor(private prisma: PrismaService) {}

  async createBid(taskId: string, freelancerId: string, dto: CreateBidDto) {
    // Check if task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if task is still open for bidding
    if (task.status !== 'OPEN') {
      throw new ForbiddenException('Task is not open for bidding');
    }

    // Check if user already bid on this task
    const existingBid = await this.prisma.bid.findFirst({
      where: {
        taskId,
        freelancerId
      }
    });

    if (existingBid) {
      throw new ForbiddenException('You have already bid on this task');
    }

    // Create the bid
    const bid = await this.prisma.bid.create({
      data: {
        taskId,
        freelancerId,
        amount: dto.amount,
        coverLetter: dto.coverLetter,
        estimatedDays: dto.estimatedDays,
        status: 'PENDING'
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            skills: true,
            avgRating: true,
            totalReviews: true
          }
        }
      }
    });

    return bid;
  }

  async getTaskBids(taskId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { taskId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            skills: true,
            avgRating: true,
            totalReviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return bids;
  }

  async getMyBids(freelancerId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { freelancerId },
      include: {
        Task: {
          select: {
            id: true,
            title: true,
            budget: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return bids;
  }
}
