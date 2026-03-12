import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateBidDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  coverLetter: string;

  @IsNumber()
  @Min(1)
  @Max(365)
  estimatedDays: number;
}
