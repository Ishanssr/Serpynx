import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Request, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/tasks')
export class TasksController {
    constructor(private tasksService: TasksService) { }

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

    @Get(':id/work-parts')
    @UseGuards(AuthGuard('jwt'))
    async getWorkParts(@Param('id') id: string, @Request() req) {
        // Check if user is authenticated
        if (!req.user) {
            throw new UnauthorizedException('Authentication required');
        }
        
        return this.tasksService.getWorkParts(id, req.user.id);
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
}
