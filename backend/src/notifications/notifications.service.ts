import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    /**
     * Create a notification for a user and optionally send an email
     */
    async create(params: {
        userId: string;
        type: string;
        message: string;
        link?: string;
    }) {
        const notification = await this.prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                message: params.message,
                link: params.link,
            },
        });

        this.logger.log(`Notification [${params.type}] for user ${params.userId}: ${params.message}`);
        return notification;
    }

    /**
     * Get user's notifications (paginated, newest first)
     */
    async getUserNotifications(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notification.count({ where: { userId } }),
            this.prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return {
            data: notifications,
            unreadCount,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        const result = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { markedRead: result.count };
    }

    /**
     * Get unread count for a user (used for badge)
     */
    async getUnreadCount(userId: string) {
        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });
        return { count };
    }

    // --- Event-triggered notification helpers ---

    async notifyBidReceived(clientId: string, freelancerName: string, taskId: string, taskTitle: string) {
        return this.create({
            userId: clientId,
            type: 'BID_RECEIVED',
            message: `${freelancerName} placed a bid on "${taskTitle}"`,
            link: `/tasks/${taskId}`,
        });
    }

    async notifyBidAccepted(freelancerId: string, taskId: string, taskTitle: string) {
        return this.create({
            userId: freelancerId,
            type: 'BID_ACCEPTED',
            message: `Your bid on "${taskTitle}" was accepted! 🎉`,
            link: `/tasks/${taskId}`,
        });
    }

    async notifyBidRejected(freelancerId: string, taskId: string, taskTitle: string) {
        return this.create({
            userId: freelancerId,
            type: 'BID_REJECTED',
            message: `Your bid on "${taskTitle}" was not selected`,
            link: `/tasks/${taskId}`,
        });
    }

    async notifyWorkSubmitted(clientId: string, freelancerName: string, taskId: string, taskTitle: string) {
        return this.create({
            userId: clientId,
            type: 'WORK_SUBMITTED',
            message: `${freelancerName} submitted work for "${taskTitle}"`,
            link: `/tasks/${taskId}`,
        });
    }

    async notifyReviewReceived(userId: string, reviewerName: string, taskId: string, taskTitle: string) {
        return this.create({
            userId,
            type: 'REVIEW_RECEIVED',
            message: `${reviewerName} left a review on "${taskTitle}"`,
            link: `/tasks/${taskId}`,
        });
    }

    async notifyTaskAssigned(freelancerId: string, taskId: string, taskTitle: string) {
        return this.create({
            userId: freelancerId,
            type: 'TASK_ASSIGNED',
            message: `You've been assigned to "${taskTitle}" — time to get started!`,
            link: `/tasks/${taskId}`,
        });
    }

  async notifyStandbyAssigned(freelancerId: string, taskId: string, taskTitle: string) {
    return this.create({
      userId: freelancerId,
      type: 'TASK_STANDBY_ASSIGNED',
      message: `You're the standby freelancer for "${taskTitle}". Stay available in case a takeover is needed.`,
      link: `/tasks/${taskId}`,
    });
  }

  async notifyStandbyPromoted(freelancerId: string, taskId: string, taskTitle: string) {
    return this.create({
      userId: freelancerId,
      type: 'TASK_STANDBY_PROMOTED',
      message: `You've been promoted from standby to primary on "${taskTitle}" — you can continue where the previous freelancer left off.`,
      link: `/tasks/${taskId}`,
    });
  }
}
