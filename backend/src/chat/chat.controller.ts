import {
    Controller, Get, Post, Param, Body, Query,
    UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendChatRequestDto, SendMessageDto } from './chat.dto';

@Controller('api/chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
    constructor(private chatService: ChatService) { }

    // Send a connection request
    @Post('request')
    sendRequest(@Request() req, @Body() dto: SendChatRequestDto) {
        return this.chatService.sendRequest(req.user.id, dto);
    }

    // Get my pending requests
    @Get('requests')
    getMyRequests(@Request() req) {
        return this.chatService.getMyRequests(req.user.id);
    }

    // Accept a request
    @Post('request/:id/accept')
    acceptRequest(@Param('id') id: string, @Request() req) {
        return this.chatService.acceptRequest(id, req.user.id);
    }

    // Reject a request
    @Post('request/:id/reject')
    rejectRequest(@Param('id') id: string, @Request() req) {
        return this.chatService.rejectRequest(id, req.user.id);
    }

    // Get all my conversations
    @Get('conversations')
    getConversations(@Request() req) {
        return this.chatService.getConversations(req.user.id);
    }

    // Get messages for a conversation
    @Get('conversations/:id/messages')
    getMessages(@Param('id') id: string, @Request() req, @Query('page') page?: string) {
        return this.chatService.getMessages(id, req.user.id, page ? parseInt(page) : 1);
    }

    // Send a message (REST fallback)
    @Post('conversations/:id/messages')
    sendMessage(@Param('id') id: string, @Request() req, @Body() dto: SendMessageDto) {
        return this.chatService.sendMessage(id, req.user.id, dto);
    }

    // Check connection status with another user
    @Get('status/:userId')
    getConnectionStatus(@Param('userId') userId: string, @Request() req) {
        return this.chatService.getConnectionStatus(req.user.id, userId);
    }
}
