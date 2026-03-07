import {
    Controller, Get, Post, Body, Param, Query, UseGuards, Request,
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
    getTaskBids(
        @Param('taskId') taskId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.bidsService.getTaskBids(taskId, Number(page) || 1, Number(limit) || 20);
    }

    @Post('bids/:bidId/accept')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    acceptBid(@Param('bidId') bidId: string, @Request() req) {
        return this.bidsService.acceptBid(bidId, req.user.id);
    }

  @Post('tasks/:taskId/assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.CLIENT)
  assignPrimaryAndStandby(
    @Param('taskId') taskId: string,
    @Request() req,
    @Body() body: { primaryBidId: string; standbyBidId?: string },
  ) {
    return this.bidsService.assignPrimaryAndStandby(
      taskId,
      req.user.id,
      body.primaryBidId,
      body.standbyBidId,
    );
  }

  @Post('tasks/:taskId/standby-takeover')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.CLIENT)
  promoteStandby(@Param('taskId') taskId: string, @Request() req) {
    return this.bidsService.promoteStandby(taskId, req.user.id);
  }

    @Get('my-bids')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.FREELANCER)
    getMyBids(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.bidsService.getFreelancerBids(req.user.id, Number(page) || 1, Number(limit) || 20);
    }
}
