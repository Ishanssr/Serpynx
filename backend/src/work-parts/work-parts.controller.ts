import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkPartsService } from './work-parts.service';

@Controller('api')
@UseGuards(AuthGuard('jwt'))
export class WorkPartsController {
  constructor(private readonly workPartsService: WorkPartsService) {}

  @Get('tasks/:taskId/work-parts')
  async getWorkPartsForTask(@Param('taskId') taskId: string, @Request() req) {
    try {
      return this.workPartsService.getWorkPartsForTask(taskId, req.user.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return [];
    }
  }

  @Patch('work-parts/:id')
  async updateWorkPart(
    @Param('id') id: string,
    @Body() body: { status?: string; content?: string },
    @Request() req,
  ) {
    return this.workPartsService.updateWorkPart(id, req.user.id, body);
  }

  @Patch('work-parts/:id/review')
  async reviewWorkPart(
    @Param('id') id: string,
    @Body() body: { status: string; feedback?: string },
    @Request() req,
  ) {
    return this.workPartsService.reviewWorkPart(id, req.user.id, body);
  }
}
