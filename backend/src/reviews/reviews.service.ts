import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }

    async createReview(taskId: string, reviewerId: string, dto: CreateReviewDto) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== reviewerId) throw new ForbiddenException('Only the task owner can review');
        if (task.status !== 'IN_REVIEW') throw new BadRequestException('Task is not in review status');
        if (!task.assignedToId) throw new BadRequestException('No freelancer assigned');

        const existing = await this.prisma.review.findUnique({ where: { taskId } });
        if (existing) throw new BadRequestException('Review already submitted');

        const reviewer = await this.prisma.user.findUnique({
            where: { id: reviewerId },
            select: { name: true },
        });

        const review = await this.prisma.review.create({
            data: {
                rating: dto.rating,
                comment: dto.comment,
                reviewerId,
                revieweeId: task.assignedToId,
                taskId,
            },
        });

        await this.prisma.task.update({
            where: { id: taskId },
            data: { status: 'COMPLETED' },
        });

        // Update freelancer's average rating
        const allReviews = await this.prisma.review.findMany({
            where: { revieweeId: task.assignedToId },
        });
        const avgRating =
            allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await this.prisma.user.update({
            where: { id: task.assignedToId },
            data: {
                avgRating: Math.round(avgRating * 100) / 100,
                totalReviews: allReviews.length,
            },
        });

        // Notify the freelancer that they received a review
        await this.notificationsService.notifyReviewReceived(
            task.assignedToId, reviewer?.name || 'The client', taskId, task.title,
        );

        return review;
    }

    async getTaskReview(taskId: string) {
        const review = await this.prisma.review.findUnique({
            where: { taskId },
            include: {
                reviewer: { select: { id: true, name: true } },
                reviewee: { select: { id: true, name: true } },
            },
        });
        if (!review) throw new NotFoundException('No review found');
        return review;
    }
}
