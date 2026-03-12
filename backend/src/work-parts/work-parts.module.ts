import { Module } from '@nestjs/common';
import { WorkPartsService } from './work-parts.service';
import { WorkPartsController } from './work-parts.controller';

@Module({
  controllers: [WorkPartsController],
  providers: [WorkPartsService],
  exports: [WorkPartsService],
})
export class WorkPartsModule {}
