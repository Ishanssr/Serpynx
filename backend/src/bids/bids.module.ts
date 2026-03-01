import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { MatchingModule } from '../matching/matching.module';

@Module({
    imports: [MatchingModule],
    controllers: [BidsController],
    providers: [BidsService],
})
export class BidsModule { }
