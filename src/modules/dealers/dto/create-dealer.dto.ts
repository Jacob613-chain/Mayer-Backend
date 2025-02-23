import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class CreateDealerDto {
  @IsString()
  @IsNotEmpty()
  dealer_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsNotEmpty()
  reps: string[];
} 
