import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { MatchingModule } from '../matching/matching.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [MatchingModule, NotificationsModule],
    controllers: [BidsController],
    providers: [BidsService],
})
export class BidsModule { }
