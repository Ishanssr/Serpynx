import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum, Min, Max } from 'class-validator';
import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';

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

export class TaskQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsString()
    skill?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minBudget?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxBudget?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(50)
    limit?: number = 12;

    @IsOptional()
    @IsString()
    sortBy?: 'createdAt' | 'budget' = 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(50)
    limit?: number = 12;
}
