import { Module } from '@nestjs/common';
import { WorkBreakdownService } from './work-breakdown.service';

@Module({
  providers: [WorkBreakdownService],
  exports: [WorkBreakdownService],
})
export class WorkBreakdownModule {}
