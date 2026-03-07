import {
    WebSocketGateway, WebSocketServer,
    SubscribeMessage, MessageBody, ConnectedSocket,
    OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(ChatGateway.name);
    private onlineUsers = new Map<string, string>(); // userId -> socketId

    constructor(
        private chatService: ChatService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const userId = payload.sub;
            client.data.userId = userId;
            this.onlineUsers.set(userId, client.id);
            this.logger.log(`User ${userId} connected to chat`);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        if (client.data.userId) {
            this.onlineUsers.delete(client.data.userId);
            this.logger.log(`User ${client.data.userId} disconnected from chat`);
        }
    }

    @SubscribeMessage('join_conversation')
    handleJoinConversation(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.join(`conversation:${data.conversationId}`);
    }

    @SubscribeMessage('leave_conversation')
    handleLeaveConversation(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.leave(`conversation:${data.conversationId}`);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(@MessageBody() data: { conversationId: string; content: string }, @ConnectedSocket() client: Socket) {
        const userId = client.data.userId;
        if (!userId) return;

        try {
            const message = await this.chatService.sendMessage(data.conversationId, userId, { content: data.content });
            this.server.to(`conversation:${data.conversationId}`).emit('new_message', message);
        } catch (error) {
            client.emit('error', { message: error.message });
        }
    }

    @SubscribeMessage('typing')
    handleTyping(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.to(`conversation:${data.conversationId}`).emit('user_typing', {
            userId: client.data.userId,
            conversationId: data.conversationId,
        });
    }

    @SubscribeMessage('stop_typing')
    handleStopTyping(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
            userId: client.data.userId,
            conversationId: data.conversationId,
        });
    }
}
