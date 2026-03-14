import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Request, UnauthorizedException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkBreakdownService } from '../work-breakdown/work-breakdown.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/tasks')
export class TasksController {
    constructor(
        private tasksService: TasksService,
        private prisma: PrismaService,
        private workBreakdownService: WorkBreakdownService
    ) { }

    @Get()
    findAll(@Query() query: TaskQueryDto) {
        return this.tasksService.findAll(query);
    }

    @Get('my')
    @UseGuards(AuthGuard('jwt'))
    findMyTasks(@Request() req) {
        return this.tasksService.findByClient(req.user.id);
    }

    @Get('assigned')
    @UseGuards(AuthGuard('jwt'))
    async getAssignedTasks(@Request() req) {
        const tasks = await this.prisma.task.findMany({
            where: {
                assignedToId: req.user.id,
                deletedAt: null,
            },
            include: {
                User: { select: { id: true, name: true } },
                Bid: {
                    where: { freelancerId: req.user.id, status: 'ACCEPTED' },
                    select: { amount: true, estimatedDays: true },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return tasks.map(t => {
            const bid = t.Bid?.[0];
            return {
                id: t.id,
                title: t.title,
                description: t.description,
                budget: t.budget,
                status: t.status,
                requiredSkills: t.requiredSkills,
                createdAt: t.createdAt,
                client: t.User || null,
                bidAmount: bid?.amount || t.budget,
                bidEstimatedDays: bid?.estimatedDays || null,
            };
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tasksService.findOne(id);
    }

    @Get(':id/create-work-parts')
    @UseGuards(AuthGuard('jwt'))
    async createWorkPartsForExistingTask(@Param('id') id: string, @Request() req) {
        // Check if user is authenticated
        if (!req.user) {
            throw new UnauthorizedException('Authentication required');
        }
        
        // Get the task
        const task = await this.tasksService.findOne(id);
        
        // Check if work parts already exist
        const existingWorkParts = await this.prisma.workPart.findMany({
            where: { taskId: id }
        });
        
        if (existingWorkParts.length > 0) {
            return { message: 'Work parts already exist', count: existingWorkParts.length };
        }
        
        // Create work parts using AI breakdown
        console.log('Creating work parts for existing task:', task.title);
        const workBreakdown = await this.workBreakdownService.breakDownWork(
            task.title,
            task.description,
            task.requiredSkills
        );
        
        console.log('Work breakdown generated:', workBreakdown);
        
        // Create work parts
        await this.prisma.$transaction(
            workBreakdown.map(part =>
                this.prisma.workPart.create({
                    data: {
                        partNumber: part.partNumber,
                        title: part.title,
                        description: part.description,
                        taskId: task.id,
                        order: part.partNumber, // Add required order field
                    },
                })
            )
        );
        
        console.log('Work parts created for existing task');
        
        return { message: 'Work parts created', count: workBreakdown.length };
    }
    @Get(':id/work-parts')
    @UseGuards(AuthGuard('jwt'))
    async getWorkParts(@Param('id') id: string, @Request() req) {
        // Check if user is authenticated
        if (!req.user) {
            throw new UnauthorizedException('Authentication required');
        }
        
        // Debug: Log the request
        console.log('Fetching work parts for task:', id, 'User:', req.user.id);
        
        const workParts = await this.tasksService.getWorkParts(id, req.user.id);
        
        // Debug: Log the result
        console.log('Work parts found:', workParts.length, workParts);
        
        return workParts;
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    create(@Request() req, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(req.user.id, dto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    update(@Param('id') id: string, @Request() req, @Body() dto: UpdateTaskDto) {
        return this.tasksService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    delete(@Param('id') id: string, @Request() req) {
        return this.tasksService.delete(id, req.user.id);
    }

    @Post(':id/assign')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.CLIENT)
    async handleTaskAssignment(
        @Param('id') taskId: string,
        @Body() body: { primaryBidId: string; standbyBidId?: string },
        @Request() req,
    ) {
        const task = await this.tasksService.findOne(taskId);
        if (!task) throw new NotFoundException('Task not found');
        if (task.clientId !== req.user.id) throw new ForbiddenException('Not your task');
        if (task.status !== 'OPEN') throw new ForbiddenException('Task is not open for assignment');

        const result = await this.tasksService.assignFreelancers(
            taskId, body.primaryBidId, body.standbyBidId,
        );
        return result;
    }
}
