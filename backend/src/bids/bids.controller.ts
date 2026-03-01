import {
    Controller, Get, Post, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BidsService } from './bids.service';
import { CreateBidDto } from './bids.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api')
export class BidsController {
    constructor(private bidsService: BidsService) { }

    @Post('tasks/:taskId/bids')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    createBid(
        @Param('taskId') taskId: string,
        @Request() req,
        @Body() dto: CreateBidDto,
    ) {
        return this.bidsService.createBid(taskId, req.user.id, dto);
    }

    @Get('tasks/:taskId/bids')
    getTaskBids(@Param('taskId') taskId: string) {
        return this.bidsService.getTaskBids(taskId);
    }

    @Post('bids/:bidId/accept')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    acceptBid(@Param('bidId') bidId: string, @Request() req) {
        return this.bidsService.acceptBid(bidId, req.user.id);
    }

    @Get('my-bids')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    getMyBids(@Request() req) {
        return this.bidsService.getFreelancerBids(req.user.id);
    }
}
