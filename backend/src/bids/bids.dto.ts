import { IsString, IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';

export class CreateBidDto {
    @IsNumber()
    @Min(1)
    amount: number;

    @IsString()
    @IsNotEmpty()
    coverLetter: string;

    @IsInt()
    @Min(1)
    estimatedDays: number;
}
