import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WorkBreakdownModule } from '../work-breakdown/work-breakdown.module';
import { WorkPartCreatorService } from './work-part-creator.service';

@Module({
    imports: [WorkBreakdownModule],
    controllers: [TasksController],
    providers: [TasksService, WorkPartCreatorService],
    exports: [TasksService],
})
export class TasksModule { }
