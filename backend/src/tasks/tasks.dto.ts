import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(1)
    budget: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requiredSkills?: string[];
}

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    budget?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requiredSkills?: string[];
}

export class TaskFilterDto {
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsString()
    skill?: string;
}
