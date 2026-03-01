import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsArray } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsEnum(Role)
    role: Role;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[];

    @IsOptional()
    @IsString()
    bio?: string;
}

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}
