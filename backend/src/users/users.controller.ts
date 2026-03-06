import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('freelancers')
    searchFreelancers(
        @Query('search') search?: string,
        @Query('skill') skill?: string,
        @Query('minRating') minRating?: string,
        @Query('sortBy') sortBy?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.usersService.searchFreelancers({
            search,
            skill,
            minRating: minRating ? Number(minRating) : undefined,
            sortBy,
            page: Number(page) || 1,
            limit: Number(limit) || 12,
        });
    }

    @Get(':id')
    getPublicProfile(@Param('id') id: string) {
        return this.usersService.getPublicProfile(id);
    }
}
