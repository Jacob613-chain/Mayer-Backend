import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDealerDto {
  @IsString()
  @IsOptional()
  search?: string;  // For searching dealer name

  @IsString()
  @IsOptional()
  rep_name?: string;  // For filtering by rep name

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