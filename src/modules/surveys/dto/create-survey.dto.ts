import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  dealer_id: string;

  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @IsString()
  @IsNotEmpty()
  customer_address: string;

  @IsString()
  @IsNotEmpty()
  rep_name: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  has_attic?: string;

  @IsOptional()
  roof_type?: string;

  @IsOptional()
  stored_items_in_attic?: string;

  @IsOptional()
  panel_location?: string;

  @IsOptional()
  main_panel_rating?: string;

  @IsOptional()
  bus_bar_rating?: string;

  @IsOptional()
  extra_breaker_space?: string;

  @IsOptional()
  breaker_spots_count?: string;

  @IsOptional()
  has_sub_panel?: string;

  @IsOptional()
  sub_panel_rating?: string;

  @IsOptional()
  sub_panel_breaker_space?: string;

  @IsOptional()
  sub_panel_bus_bar_rating?: string;

  @IsOptional()
  panel_brand?: string;

  @IsOptional()
  panel_model?: string;

  @IsOptional()
  panel_year?: string;

  @IsOptional()
  panel_notes?: string;

  @IsOptional()
  utility_meter_on_wall?: string;

  @IsOptional()
  has_generators?: string;

  @IsOptional()
  has_existing_system?: string;

  @IsOptional()
  existing_system_type?: string;

  @IsOptional()
  existing_inverter_count?: string;

  @IsOptional()
  existing_panel_count?: string;

  @IsOptional()
  existing_battery_count?: string;

  @IsOptional()
  has_hoa?: string;

  @IsOptional()
  has_wifi?: string;

  @IsOptional()
  additional_notes?: string;

  @IsOptional()
  ground_mount_video?: string;

  @IsOptional()
  trenching_type?: 'dirt' | 'gravel' | 'concrete' | 'grass';

  @IsOptional()
  response_data?: any;
} 