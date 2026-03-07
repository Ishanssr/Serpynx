import {
    Controller, Get, Post, Delete,
    Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamsService } from './teams.service';
import { CreateTeamDto, InviteToTeamDto } from './teams.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/teams')
@UseGuards(AuthGuard('jwt'))
export class TeamsController {
    constructor(private teamsService: TeamsService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.FREELANCER)
    create(@Request() req, @Body() dto: CreateTeamDto) {
        return this.teamsService.create(req.user.id, dto);
    }

    @Get('my')
    findMyTeams(@Request() req) {
        return this.teamsService.findMyTeams(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.teamsService.findOne(id, req.user.id);
    }

    @Post(':id/invite')
    @UseGuards(RolesGuard)
    @Roles(Role.FREELANCER)
    invite(@Param('id') id: string, @Request() req, @Body() dto: InviteToTeamDto) {
        return this.teamsService.invite(id, req.user.id, dto);
    }

    @Post(':id/leave')
    leave(@Param('id') id: string, @Request() req) {
        return this.teamsService.leave(id, req.user.id);
    }

    @Delete(':id/members/:memberId')
    removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
        return this.teamsService.removeMember(id, req.user.id, memberId);
    }
}
