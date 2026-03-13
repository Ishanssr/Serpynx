import {
    Controller, Get, Post, Delete, Param, Body, UseGuards, Request,
    NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/teams')
export class TeamsController {
    constructor(private prisma: PrismaService) {}

    @Post()
    async createTeam(@Request() req, @Body() body: { name: string; description?: string }) {
        const team = await this.prisma.team.create({
            data: {
                name: body.name,
                description: body.description,
                createdById: req.user.id,
                teamMembers: {
                    create: { userId: req.user.id, role: 'LEADER' },
                },
            },
            include: {
                teamMembers: { include: { User: { select: { id: true, name: true } } } },
                _count: { select: { teamMembers: true, Bid: true } },
            },
        });
        return this.transformTeam(team);
    }

    @Get('my')
    async getMyTeams(@Request() req) {
        const teams = await this.prisma.team.findMany({
            where: {
                teamMembers: { some: { userId: req.user.id } },
            },
            include: {
                teamMembers: { include: { User: { select: { id: true, name: true } } } },
                _count: { select: { teamMembers: true, Bid: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return teams.map(t => this.transformTeam(t));
    }

    @Get(':id')
    async getTeam(@Param('id') id: string) {
        const team = await this.prisma.team.findUnique({
            where: { id },
            include: {
                teamMembers: { include: { User: { select: { id: true, name: true, skills: true, avgRating: true } } } },
                Bid: {
                    include: { Task: { select: { id: true, title: true, status: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                _count: { select: { teamMembers: true, Bid: true } },
            },
        });
        if (!team) throw new NotFoundException('Team not found');
        return this.transformTeam(team);
    }

    @Post(':teamId/invite')
    async inviteToTeam(
        @Param('teamId') teamId: string,
        @Request() req,
        @Body() body: { email: string },
    ) {
        const team = await this.prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new NotFoundException('Team not found');
        if (team.createdById !== req.user.id) throw new ForbiddenException('Only team leader can invite');

        const user = await this.prisma.user.findUnique({ where: { email: body.email } });
        if (!user) throw new NotFoundException('User not found');

        const existing = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: user.id } },
        });
        if (existing) throw new ForbiddenException('User is already a team member');

        await this.prisma.teamMember.create({
            data: { teamId, userId: user.id, role: 'MEMBER' },
        });
        return { message: 'User invited successfully' };
    }

    @Post(':teamId/leave')
    async leaveTeam(@Param('teamId') teamId: string, @Request() req) {
        const member = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: req.user.id } },
        });
        if (!member) throw new NotFoundException('You are not a member of this team');
        if (member.role === 'LEADER') throw new ForbiddenException('Leader cannot leave the team');

        await this.prisma.teamMember.delete({
            where: { teamId_userId: { teamId, userId: req.user.id } },
        });
        return { message: 'Left team successfully' };
    }

    @Delete(':teamId/members/:memberId')
    async removeMember(
        @Param('teamId') teamId: string,
        @Param('memberId') memberId: string,
        @Request() req,
    ) {
        const team = await this.prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new NotFoundException('Team not found');
        if (team.createdById !== req.user.id) throw new ForbiddenException('Only team leader can remove members');

        await this.prisma.teamMember.delete({
            where: { id: memberId },
        });
        return { message: 'Member removed' };
    }

    private transformTeam(team: any) {
        if (!team) return team;
        const { teamMembers, Bid, _count, ...rest } = team;
        return {
            ...rest,
            members: teamMembers?.map(m => ({ ...m, user: m.User, User: undefined })),
            bids: Bid?.map(b => {
                const { Task, ...bidRest } = b;
                return { ...bidRest, task: Task };
            }),
            _count: _count ? { members: _count.teamMembers, bids: _count.Bid } : undefined,
        };
    }
}
