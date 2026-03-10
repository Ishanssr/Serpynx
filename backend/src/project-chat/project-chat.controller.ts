import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { ProjectChatService } from './project-chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('project-chat')
@UseGuards(JwtAuthGuard)
export class ProjectChatController {
  constructor(private readonly projectChatService: ProjectChatService) {}

  @Post(':taskId/messages')
  async sendMessage(
    @Param('taskId') taskId: string,
    @Body('message') message: string,
    @Request() req
  ) {
    if (!message?.trim()) {
      throw new BadRequestException('Message is required');
    }

    return this.projectChatService.sendMessage(taskId, req.user.id, message);
  }

  @Get(':taskId/messages')
  async getMessages(@Param('taskId') taskId: string, @Request() req) {
    return this.projectChatService.getMessages(taskId, req.user.id);
  }
}
