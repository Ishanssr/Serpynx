import { Module } from '@nestjs/common';
import { ProjectChatService } from './project-chat.service';
import { ProjectChatController } from './project-chat.controller';

@Module({
  controllers: [ProjectChatController],
  providers: [ProjectChatService],
  exports: [ProjectChatService],
})
export class ProjectChatModule {}
