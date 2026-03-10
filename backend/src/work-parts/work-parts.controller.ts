import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { WorkPartsService } from './work-parts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkPartStatus } from '@prisma/client';

@Controller('work-parts')
@UseGuards(JwtAuthGuard)
export class WorkPartsController {
  constructor(private readonly workPartsService: WorkPartsService) {}

  @Post()
  async createWorkPart(
    @Body() body: { taskId: string; title: string; description: string; order: number },
    @Request() req
  ) {
    const { taskId, title, description, order } = body;
    
    if (!taskId?.trim() || !title?.trim() || !description?.trim() || order === undefined) {
      throw new BadRequestException('All fields are required');
    }

    return this.workPartsService.createWorkPart(taskId, title, description, order, req.user.id);
  }

  @Patch(':id')
  async updateWorkPart(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req
  ) {
    return this.workPartsService.updateWorkPart(id, body, req.user.id);
  }

  @Patch(':id/status')
  async updateWorkPartStatus(
    @Param('id') id: string,
    @Body('status') status: WorkPartStatus,
    @Request() req
  ) {
    if (!Object.values(WorkPartStatus).includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    return this.workPartsService.updateWorkPartStatus(id, status, req.user.id);
  }

  @Delete(':id')
  async deleteWorkPart(@Param('id') id: string, @Request() req) {
    return this.workPartsService.deleteWorkPart(id, req.user.id);
  }

  @Get('task/:taskId')
  async getWorkPartsForTask(@Param('taskId') taskId: string, @Request() req) {
    return this.workPartsService.getWorkPartsForTask(taskId, req.user.id);
  }
}
