import { Module } from '@nestjs/common';
import { WorkSubmissionService } from './work-submission.service';
import { WorkSubmissionController } from './work-submission.controller';

@Module({
  controllers: [WorkSubmissionController],
  providers: [WorkSubmissionService],
  exports: [WorkSubmissionService],
})
export class WorkSubmissionModule {}
