import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  dealer_id: string;

  @IsString()
  @IsNotEmpty()
  rep_name: string;

  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @IsString()
  @IsNotEmpty()
  customer_address: string;

  @IsString()
  @IsNotEmpty()
  response_data: string; // JSON string of survey responses
} 