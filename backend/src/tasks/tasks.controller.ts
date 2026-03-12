import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Request, UnauthorizedException,
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
    @UseGuards(AuthGuard('jwt'))
    async handleTaskAssignment(@Param('id') taskId: string) {
        await this.tasksService.handleTaskAssignment(taskId);
        return { message: 'Work parts created for assigned task' };
    }
}
