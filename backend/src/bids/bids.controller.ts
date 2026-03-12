import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BidsService } from './bids.service';
import { CreateBidDto } from './bids.dto';

@Controller('tasks/:taskId/bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createBid(
    @Param('taskId') taskId: string,
    @Body() dto: CreateBidDto,
    @Req() req: any
  ) {
    return this.bidsService.createBid(taskId, req.user.id, dto);
  }

  @Get()
  async getTaskBids(@Param('taskId') taskId: string) {
    return this.bidsService.getTaskBids(taskId);
  }
}
