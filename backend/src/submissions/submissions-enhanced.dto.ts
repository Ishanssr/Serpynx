import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateSubmissionDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsString()
    link?: string;
}

export class UpdateWorkPartDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED'])
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';
}

export class CreateWorkBreakdownDto {
    @IsArray()
    workParts: {
        partNumber: number;
        title: string;
        description: string;
    }[];
}

export class ReviewWorkPartDto {
    @IsEnum(['APPROVED', 'REVISION_REQUIRED'])
    status: 'APPROVED' | 'REVISION_REQUIRED';

    @IsOptional()
    @IsString()
    feedback?: string;
}
