import {
    Controller, Get, Post, Param, Body, Query, UseGuards, Request,
    NotFoundException, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/chat')
export class ChatController {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) {}

    // Send a chat request to another user
    @Post('request')
    async sendChatRequest(@Request() req, @Body() body: { receiverId: string }) {
        if (req.user.id === body.receiverId) {
            throw new ForbiddenException('Cannot send chat request to yourself');
        }

        const existing = await this.prisma.chatRequest.findFirst({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId: body.receiverId },
                    { senderId: body.receiverId, receiverId: req.user.id },
                ],
            },
        });
        if (existing) throw new ForbiddenException('Chat request already exists');

        // Check if conversation already exists
        const existingConvo = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { user1Id: req.user.id, user2Id: body.receiverId },
                    { user1Id: body.receiverId, user2Id: req.user.id },
                ],
            },
        });
        if (existingConvo) throw new ForbiddenException('You already have a conversation with this user');

        const chatRequest = await this.prisma.chatRequest.create({
            data: { senderId: req.user.id, receiverId: body.receiverId },
            include: {
                User_ChatRequest_receiverIdToUser: { select: { id: true, name: true } },
                User_ChatRequest_senderIdToUser: { select: { id: true, name: true } },
            },
        });

        // Notify the receiver about the connect request
        const senderName = chatRequest.User_ChatRequest_senderIdToUser?.name || 'Someone';
        this.notificationsService.create({
            userId: body.receiverId,
            type: 'CONNECT_REQUEST',
            message: `${senderName} sent you a connection request`,
            link: `/chat`,
        }).catch(err => console.error('Failed to send connect notification:', err));

        return chatRequest;
    }

    // Get pending chat requests for the current user
    @Get('requests')
    async getChatRequests(@Request() req) {
        const requests = await this.prisma.chatRequest.findMany({
            where: {
                OR: [
                    { receiverId: req.user.id },
                    { senderId: req.user.id },
                ],
            },
            include: {
                User_ChatRequest_receiverIdToUser: { select: { id: true, name: true } },
                User_ChatRequest_senderIdToUser: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return requests.map(r => ({
            ...r,
            sender: r.User_ChatRequest_senderIdToUser,
            receiver: r.User_ChatRequest_receiverIdToUser,
            User_ChatRequest_senderIdToUser: undefined,
            User_ChatRequest_receiverIdToUser: undefined,
        }));
    }

    // Accept a chat request
    @Post('request/:id/accept')
    async acceptChatRequest(@Param('id') id: string, @Request() req) {
        const chatReq = await this.prisma.chatRequest.findUnique({ where: { id } });
        if (!chatReq) throw new NotFoundException('Chat request not found');
        if (chatReq.receiverId !== req.user.id) throw new ForbiddenException('Not your request');

        await this.prisma.chatRequest.update({
            where: { id },
            data: { status: 'ACCEPTED' },
        });

        // Create the conversation
        const conversation = await this.prisma.conversation.create({
            data: {
                user1Id: chatReq.senderId,
                user2Id: chatReq.receiverId,
            },
        });

        return { message: 'Chat request accepted', conversationId: conversation.id };
    }

    // Reject a chat request
    @Post('request/:id/reject')
    async rejectChatRequest(@Param('id') id: string, @Request() req) {
        const chatReq = await this.prisma.chatRequest.findUnique({ where: { id } });
        if (!chatReq) throw new NotFoundException('Chat request not found');
        if (chatReq.receiverId !== req.user.id) throw new ForbiddenException('Not your request');

        await this.prisma.chatRequest.update({
            where: { id },
            data: { status: 'REJECTED' },
        });

        return { message: 'Chat request rejected' };
    }

    // Get user's conversations
    @Get('conversations')
    async getConversations(@Request() req) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { user1Id: req.user.id },
                    { user2Id: req.user.id },
                ],
            },
            include: {
                User_Conversation_user1IdToUser: { select: { id: true, name: true, avatarUrl: true } },
                User_Conversation_user2IdToUser: { select: { id: true, name: true, avatarUrl: true } },
                Message: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return conversations.map(c => {
            const otherUser = c.user1Id === req.user.id
                ? c.User_Conversation_user2IdToUser
                : c.User_Conversation_user1IdToUser;
            return {
                id: c.id,
                otherUser,
                lastMessage: c.Message[0] || null,
                updatedAt: c.updatedAt,
            };
        });
    }

    // Get messages in a conversation
    @Get('conversations/:conversationId/messages')
    async getMessages(
        @Param('conversationId') conversationId: string,
        @Query('page') page = '1',
        @Request() req,
    ) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
            throw new ForbiddenException('Not your conversation');
        }

        const take = 50;
        const skip = ((Number(page) || 1) - 1) * take;

        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            include: {
                User: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
            skip,
            take,
        });

        return {
            data: messages.map(m => ({
                ...m,
                sender: m.User,
                User: undefined,
            })),
        };
    }

    // Mark messages as read in a conversation
    @Post('conversations/:conversationId/read')
    async markAsRead(
        @Param('conversationId') conversationId: string,
        @Request() req,
    ) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
            throw new ForbiddenException('Not your conversation');
        }

        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: req.user.id },
                read: false,
            },
            data: { read: true },
        });

        return { success: true };
    }

    // Send a text message  
    @Post('conversations/:conversationId/messages')
    async sendMessage(
        @Param('conversationId') conversationId: string,
        @Body() body: { content: string; fileUrl?: string; fileType?: string; fileName?: string; fileSize?: number },
        @Request() req,
    ) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
            throw new ForbiddenException('Not your conversation');
        }

        const message = await this.prisma.message.create({
            data: {
                content: body.content || '',
                senderId: req.user.id,
                conversationId,
                fileUrl: body.fileUrl || null,
                fileType: body.fileType || null,
                fileName: body.fileName || null,
                fileSize: body.fileSize || null,
            },
            include: {
                User: { select: { id: true, name: true } },
            },
        });

        // Update conversation timestamp
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        // Notify the other user about the new message
        const receiverId = conversation.user1Id === req.user.id
            ? conversation.user2Id : conversation.user1Id;
        const senderName = message.User?.name || 'Someone';
        const preview = body.fileName ? `📎 ${body.fileName}` : (body.content?.length > 50 ? body.content.slice(0, 50) + '...' : body.content);
        this.notificationsService.create({
            userId: receiverId,
            type: 'NEW_MESSAGE',
            message: `${senderName}: ${preview}`,
            link: `/chat`,
        }).catch(err => console.error('Failed to send message notification:', err));

        return { ...message, sender: message.User, User: undefined };
    }

    // Upload a file and send as message
    @Post('conversations/:conversationId/upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/chat-files',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed'];
                cb(null, allowed.includes(file.mimetype));
            },
            limits: { fileSize: 25 * 1024 * 1024 },
        }),
    )
    async uploadChatFile(
        @Param('conversationId') conversationId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { content?: string },
        @Request() req,
    ) {
        if (!file) throw new BadRequestException('No file uploaded');

        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
            throw new ForbiddenException('Not your conversation');
        }

        const fileUrl = `/uploads/chat-files/${file.filename}`;
        const message = await this.prisma.message.create({
            data: {
                content: body.content || '',
                senderId: req.user.id,
                conversationId,
                fileUrl,
                fileType: file.mimetype,
                fileName: file.originalname,
                fileSize: file.size,
            },
            include: {
                User: { select: { id: true, name: true } },
            },
        });

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        const receiverId = conversation.user1Id === req.user.id
            ? conversation.user2Id : conversation.user1Id;
        const senderName = message.User?.name || 'Someone';
        this.notificationsService.create({
            userId: receiverId,
            type: 'NEW_MESSAGE',
            message: `${senderName}: 📎 ${file.originalname}`,
            link: `/chat`,
        }).catch(err => console.error('Failed to send message notification:', err));

        return { ...message, sender: message.User, User: undefined };
    }

    // Get connection status with another user
    @Get('status/:userId')
    async getConnectionStatus(@Param('userId') userId: string, @Request() req) {
        // Check for existing conversation
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                OR: [
                    { user1Id: req.user.id, user2Id: userId },
                    { user1Id: userId, user2Id: req.user.id },
                ],
            },
        });
        if (conversation) {
            return { status: 'CONNECTED', conversationId: conversation.id };
        }

        // Check for pending request
        const request = await this.prisma.chatRequest.findFirst({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId: userId },
                    { senderId: userId, receiverId: req.user.id },
                ],
            },
        });
        if (request) {
            return { status: request.status, requestId: request.id, isSender: request.senderId === req.user.id };
        }

        return { status: 'NONE' };
    }

    // Get unread message count (for badge on Messages nav)
    @Get('unread-count')
    async getUnreadMessageCount(@Request() req) {
        // Find all conversations the user is part of
        const conversations = await this.prisma.conversation.findMany({
            where: {
                OR: [
                    { user1Id: req.user.id },
                    { user2Id: req.user.id },
                ],
            },
            select: { id: true },
        });
        const convoIds = conversations.map(c => c.id);
        if (convoIds.length === 0) return { count: 0 };

        const count = await this.prisma.message.count({
            where: {
                conversationId: { in: convoIds },
                senderId: { not: req.user.id },
                read: false,
            },
        });
        return { count };
    }
}
