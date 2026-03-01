import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './submissions.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/tasks/:taskId')
export class SubmissionsController {
    constructor(private submissionsService: SubmissionsService) { }

    @Post('submit')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    submitWork(
        @Param('taskId') taskId: string,
        @Request() req,
        @Body() dto: CreateSubmissionDto,
    ) {
        return this.submissionsService.submitWork(taskId, req.user.id, dto);
    }

    @Get('submission')
    @UseGuards(AuthGuard('jwt'))
    getSubmission(@Param('taskId') taskId: string) {
        return this.submissionsService.getSubmission(taskId);
    }
}
