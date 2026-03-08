import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, UpdateWorkPartDto, ReviewWorkPartDto } from './submissions-enhanced.dto';
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

    @Get('work-parts')
    @UseGuards(AuthGuard('jwt'))
    getWorkParts(@Param('taskId') taskId: string, @Request() req) {
        return this.submissionsService.getWorkParts(taskId, req.user.id);
    }
}

@Controller('api/work-parts/:workPartId')
export class WorkPartsController {
    constructor(private submissionsService: SubmissionsService) { }

    @Patch()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    updateWorkPart(
        @Param('workPartId') workPartId: string,
        @Request() req,
        @Body() dto: UpdateWorkPartDto,
    ) {
        return this.submissionsService.updateWorkPart(workPartId, req.user.id, dto);
    }

    @Patch('review')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    reviewWorkPart(
        @Param('workPartId') workPartId: string,
        @Request() req,
        @Body() dto: ReviewWorkPartDto,
    ) {
        return this.submissionsService.reviewWorkPart(workPartId, req.user.id, dto);
    }
}
