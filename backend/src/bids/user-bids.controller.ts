import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BidsService } from './bids.service';

@Controller('api/bids')
export class UserBidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyBids(@Req() req: any) {
    return this.bidsService.getMyBids(req.user.id);
  }
}
