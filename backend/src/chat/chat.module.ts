import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [ChatController],
})
export class ChatModule {}
