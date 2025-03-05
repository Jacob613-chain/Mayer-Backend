import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateDealerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsArray()
  @IsOptional()
  reps?: string[];
}
