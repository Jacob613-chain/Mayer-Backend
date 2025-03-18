import { IsString, IsOptional, IsNumber, IsPositive, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSurveyDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  id?: number;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsString()
  @IsOptional()
  customer_address?: string;

  @IsString()
  @IsOptional()
  dealer_id?: string;

  @IsString()
  @IsOptional()
  dealer_name?: string;

  @IsString()
  @IsOptional()
  rep_name?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  include_dealer_info: boolean = true;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number = 1;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  limit?: number = 10;
}
