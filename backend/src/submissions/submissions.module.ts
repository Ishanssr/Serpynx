import { Module } from '@nestjs/common';
import { SubmissionsController, WorkPartsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { WorkBreakdownModule } from '../work-breakdown/work-breakdown.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WorkBreakdownModule, NotificationsModule],
  controllers: [SubmissionsController, WorkPartsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule { }
