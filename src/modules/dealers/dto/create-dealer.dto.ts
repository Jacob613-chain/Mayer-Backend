import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateDealerDto {
  @IsString()
  @IsNotEmpty()
  dealer_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsArray()
  @IsNotEmpty()
  reps: string[];
} 
