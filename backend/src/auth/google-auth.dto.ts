import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class GoogleAuthDto {
    @IsString()
    @IsNotEmpty()
    credential: string;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}
