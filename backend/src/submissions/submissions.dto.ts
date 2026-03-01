import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubmissionDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsString()
    link?: string;
}
