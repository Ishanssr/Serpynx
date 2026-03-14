import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WorkBreakdownModule } from '../work-breakdown/work-breakdown.module';
import { WorkPartCreatorService } from './work-part-creator.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [WorkBreakdownModule, NotificationsModule],
    controllers: [TasksController],
    providers: [TasksService, WorkPartCreatorService],
    exports: [TasksService],
})
export class TasksModule { }
