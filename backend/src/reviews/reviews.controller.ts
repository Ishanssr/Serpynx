import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './reviews.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/tasks/:taskId')
export class ReviewsController {
    constructor(private reviewsService: ReviewsService) { }

    @Post('review')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    createReview(
        @Param('taskId') taskId: string,
        @Request() req,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewsService.createReview(taskId, req.user.id, dto);
    }

    @Get('review')
    @UseGuards(AuthGuard('jwt'))
    getTaskReview(@Param('taskId') taskId: string) {
        return this.reviewsService.getTaskReview(taskId);
    }
}
