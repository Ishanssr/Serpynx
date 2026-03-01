import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { BidsModule } from './bids/bids.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MatchingModule } from './matching/matching.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TasksModule,
    BidsModule,
    SubmissionsModule,
    ReviewsModule,
    MatchingModule,
  ],
})
export class AppModule { }
