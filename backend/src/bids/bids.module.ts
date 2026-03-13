import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { UserBidsController } from './user-bids.controller';
import { BidsService } from './bids.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BidsController, UserBidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
