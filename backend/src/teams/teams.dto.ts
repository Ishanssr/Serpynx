import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTeamDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class InviteToTeamDto {
    @IsString()
    @IsNotEmpty()
    email: string;
}
