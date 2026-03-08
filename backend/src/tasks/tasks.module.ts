import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WorkBreakdownModule } from '../work-breakdown/work-breakdown.module';

@Module({
    imports: [WorkBreakdownModule],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }
