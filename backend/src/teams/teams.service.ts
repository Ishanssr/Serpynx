import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, InviteToTeamDto } from './teams.dto';

@Injectable()
export class TeamsService {
    private readonly logger = new Logger(TeamsService.name);

    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateTeamDto) {
        const team = await this.prisma.team.create({
            data: {
                name: dto.name,
                description: dto.description,
                createdById: userId,
                members: {
                    create: {
                        userId,
                        role: 'LEADER',
                    },
                },
            },
            include: {
                members: { include: { user: { select: { id: true, name: true, email: true, skills: true, avgRating: true } } } },
            },
        });

        return team;
    }

    async findMyTeams(userId: string) {
        return this.prisma.team.findMany({
            where: {
                members: { some: { userId } },
            },
            include: {
                _count: { select: { members: true, bids: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, skills: true, avgRating: true } },
                    },
                },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(teamId: string, userId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, skills: true, avgRating: true, avatarUrl: true } },
                    },
                },
                createdBy: { select: { id: true, name: true } },
                bids: {
                    include: {
                        task: { select: { id: true, title: true, budget: true, status: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                _count: { select: { members: true, bids: true } },
            },
        });

        if (!team) throw new NotFoundException('Team not found');

        // Only members can view team details
        const isMember = team.members.some(m => m.userId === userId);
        if (!isMember) throw new ForbiddenException('You are not a member of this team');

        return team;
    }

    async invite(teamId: string, userId: string, dto: InviteToTeamDto) {
        // Verify team exists and user is a leader
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) throw new NotFoundException('Team not found');

        const isLeader = team.members.some(m => m.userId === userId && m.role === 'LEADER');
        if (!isLeader) throw new ForbiddenException('Only team leaders can invite members');

        // Find the user to invite
        const invitee = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!invitee) throw new NotFoundException(`No user found with email ${dto.email}`);
        if (invitee.role !== 'FREELANCER') throw new ForbiddenException('Only freelancers can join teams');

        // Check if already a member
        const existing = team.members.find(m => m.userId === invitee.id);
        if (existing) throw new ConflictException('User is already a team member');

        // Add member
        await this.prisma.teamMember.create({
            data: {
                teamId,
                userId: invitee.id,
                role: 'MEMBER',
            },
        });

        // Send notification
        await this.prisma.notification.create({
            data: {
                type: 'TEAM_INVITE',
                message: `You've been added to team "${team.name}"`,
                link: `/teams/${teamId}`,
                userId: invitee.id,
            },
        });

        this.logger.log(`User ${invitee.email} added to team ${team.name}`);

        return { message: `${invitee.name} added to the team` };
    }

    async leave(teamId: string, userId: string) {
        const membership = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });

        if (!membership) throw new NotFoundException('You are not a member of this team');
        if (membership.role === 'LEADER') {
            // If leader leaves, check if there are other members
            const memberCount = await this.prisma.teamMember.count({ where: { teamId } });
            if (memberCount > 1) {
                throw new ForbiddenException('Transfer leadership before leaving. You are the team leader.');
            }
            // Last member — delete the team
            await this.prisma.team.delete({ where: { id: teamId } });
            return { message: 'Team deleted (you were the last member)' };
        }

        await this.prisma.teamMember.delete({
            where: { teamId_userId: { teamId, userId } },
        });

        return { message: 'You have left the team' };
    }

    async removeMember(teamId: string, leaderId: string, memberId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        });

        if (!team) throw new NotFoundException('Team not found');

        const isLeader = team.members.some(m => m.userId === leaderId && m.role === 'LEADER');
        if (!isLeader) throw new ForbiddenException('Only team leaders can remove members');

        if (leaderId === memberId) throw new ForbiddenException('Cannot remove yourself. Use leave instead.');

        await this.prisma.teamMember.delete({
            where: { teamId_userId: { teamId, userId: memberId } },
        });

        return { message: 'Member removed from team' };
    }
}
