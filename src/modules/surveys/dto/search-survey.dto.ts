import { IsString, IsOptional, IsNumber, IsPositive, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSurveyDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
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

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  include_dealer_info?: boolean;
  
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
  limit?: number = 10;
}
