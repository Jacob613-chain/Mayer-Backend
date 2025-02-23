import { IsString, IsOptional } from 'class-validator';

export class SearchSurveyDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  dealer_id?: string;

  @IsString()
  @IsOptional()
  rep_name?: string;
} 