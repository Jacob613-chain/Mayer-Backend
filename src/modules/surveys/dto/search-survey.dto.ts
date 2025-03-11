import { IsString, IsOptional, IsNumber, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSurveyDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  dealer_id?: string;

  @IsString()
  @IsOptional()
  rep_name?: string;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  page?: number = 1;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100)
  limit?: number = 10;
}
