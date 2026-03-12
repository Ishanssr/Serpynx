import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkPartsService } from './work-parts.service';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class WorkPartsController {
  constructor(private readonly workPartsService: WorkPartsService) {}

  @Get(':taskId/work-parts')
  async getWorkPartsForTask(@Param('taskId') taskId: string, @Request() req) {
    try {
      return this.workPartsService.getWorkPartsForTask(taskId, req.user.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Return empty array if there are no work parts or other issues
      return [];
    }
  }
}
