import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatRequestDto, SendMessageDto } from './chat.dto';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(private prisma: PrismaService) { }

    // Send a chat request
    async sendRequest(senderId: string, dto: SendChatRequestDto) {
        if (senderId === dto.receiverId) throw new ForbiddenException('Cannot send request to yourself');

        const receiver = await this.prisma.user.findUnique({ where: { id: dto.receiverId } });
        if (!receiver) throw new NotFoundException('User not found');

        // Check if request already exists (in either direction)
        const existing = await this.prisma.chatRequest.findFirst({
            where: {
                OR: [
                    { senderId, receiverId: dto.receiverId },
                    { senderId: dto.receiverId, receiverId: senderId },
                ],
            },
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') throw new ConflictException('You are already connected');
            if (existing.status === 'PENDING') throw new ConflictException('A request is already pending');
            // If rejected, allow re-send by updating
            if (existing.status === 'REJECTED' && existing.senderId === senderId) {
                return this.prisma.chatRequest.update({
                    where: { id: existing.id },
                    data: { status: 'PENDING', createdAt: new Date() },
                });
            }
        }

        const request = await this.prisma.chatRequest.create({
            data: { senderId, receiverId: dto.receiverId },
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } },
            },
        });

        // Notify receiver
        await this.prisma.notification.create({
            data: {
                type: 'CHAT_REQUEST',
                message: `${request.sender.name} wants to connect with you`,
                link: '/chat',
                userId: dto.receiverId,
            },
        });

        return request;
    }

    // Get pending requests for user
    async getMyRequests(userId: string) {
        const [received, sent] = await Promise.all([
            this.prisma.chatRequest.findMany({
                where: { receiverId: userId, status: 'PENDING' },
                include: { sender: { select: { id: true, name: true, skills: true, avgRating: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.chatRequest.findMany({
                where: { senderId: userId, status: 'PENDING' },
                include: { receiver: { select: { id: true, name: true, skills: true, avgRating: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return { received, sent };
    }

    // Accept a chat request
    async acceptRequest(requestId: string, userId: string) {
        const request = await this.prisma.chatRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new NotFoundException('Request not found');
        if (request.receiverId !== userId) throw new ForbiddenException('Not your request');
        if (request.status !== 'PENDING') throw new ForbiddenException('Request already handled');

        // Update request status
        await this.prisma.chatRequest.update({
            where: { id: requestId },
            data: { status: 'ACCEPTED' },
        });

        // Create a conversation (order user IDs for consistency)
        const [u1, u2] = [request.senderId, request.receiverId].sort();
        const conversation = await this.prisma.conversation.upsert({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
            create: { user1Id: u1, user2Id: u2 },
            update: {},
        });

        // Notify sender
        await this.prisma.notification.create({
            data: {
                type: 'CHAT_ACCEPTED',
                message: 'Your connection request was accepted!',
                link: `/chat/${conversation.id}`,
                userId: request.senderId,
            },
        });

        return conversation;
    }

    // Reject a request
    async rejectRequest(requestId: string, userId: string) {
        const request = await this.prisma.chatRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new NotFoundException('Request not found');
        if (request.receiverId !== userId) throw new ForbiddenException('Not your request');

        return this.prisma.chatRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });
    }

    // Get all conversations for a user
    async getConversations(userId: string) {
        const convos = await this.prisma.conversation.findMany({
            where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
            include: {
                user1: { select: { id: true, name: true, avatarUrl: true } },
                user2: { select: { id: true, name: true, avatarUrl: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return convos.map(c => {
            const otherUser = c.user1Id === userId ? c.user2 : c.user1;
            const lastMessage = c.messages[0] || null;
            return {
                id: c.id,
                otherUser,
                lastMessage: lastMessage ? { content: lastMessage.content, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId } : null,
                updatedAt: c.updatedAt,
            };
        });
    }

    // Get messages for a conversation
    async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
        const convo = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!convo) throw new NotFoundException('Conversation not found');
        if (convo.user1Id !== userId && convo.user2Id !== userId) throw new ForbiddenException('Not your conversation');

        const skip = (page - 1) * limit;
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            include: { sender: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        // Mark unread messages as read
        await this.prisma.message.updateMany({
            where: { conversationId, senderId: { not: userId }, read: false },
            data: { read: true },
        });

        return messages.reverse();
    }

    // Send a message
    async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
        const convo = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!convo) throw new NotFoundException('Conversation not found');
        if (convo.user1Id !== senderId && convo.user2Id !== senderId) throw new ForbiddenException('Not your conversation');

        const message = await this.prisma.message.create({
            data: {
                content: dto.content,
                senderId,
                conversationId,
            },
            include: { sender: { select: { id: true, name: true } } },
        });

        // Update conversation timestamp
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return message;
    }

    // Check connection status between two users
    async getConnectionStatus(userId: string, targetId: string) {
        const request = await this.prisma.chatRequest.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: targetId },
                    { senderId: targetId, receiverId: userId },
                ],
            },
        });
        if (!request) return { status: 'NONE' };
        return { status: request.status, requestId: request.id, direction: request.senderId === userId ? 'SENT' : 'RECEIVED' };
    }
}
