import { Controller, Get, Post, Param, Render, NotFoundException, Body, UseInterceptors, UploadedFiles, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SurveyFormService } from './survey-form.service';
import { CreateSurveyDto } from '../surveys/dto/create-survey.dto';

@Controller('')  // Empty string to handle root routes
export class SurveyFormController {
  private readonly logger = new Logger(SurveyFormController.name);

  constructor(private readonly surveyFormService: SurveyFormService) { }

  @Get()
  @Render('search')
  getSearchPage() {
    return {};
  }

  @Get('form')
  @Render('survey-form')
  getDefaultForm() {
    return {
      title: 'Inspire Solar x Mayer Site Survey Form',
      dealerId: '',
      dealerName: '',
      reps: ['']
    };
  }

  @Get(':dealer_id')
  @Render('survey-form')
  async getSurveyForm(@Param('dealer_id') dealerId: string) {
    try {
      const dealer = await this.surveyFormService.getDealerInfo(dealerId);

      return {
        title: dealer.name,
        logo: dealer.logo || null, // Ensure logo is explicitly null if not present
        dealerId: dealer.dealer_id,
        dealerName: dealer.name,
        reps: dealer.reps || ['']
      };
    } catch (error) {
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
  }

  @Post('surveys')
  @UseInterceptors(FilesInterceptor('photos', 20))
  async submitSurvey(
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      const dealerId = formData.dealer_id;
      if (!dealerId) {
        throw new BadRequestException('dealer_id is required');
      }

      // Create survey DTO with all fields from formData
      const createSurveyDto: CreateSurveyDto = {
        dealer_id: dealerId,
        rep_name: formData.rep_name,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        description: formData.description,
        has_attic: formData.has_attic,
        roof_type: formData.roof_type,
        stored_items_in_attic: formData.stored_items_in_attic,
        panel_location: formData.panel_location,
        main_panel_rating: formData.main_panel_rating,
        bus_bar_rating: formData.bus_bar_rating,
        extra_breaker_space: formData.extra_breaker_space,
        breaker_spots_count: formData.breaker_spots_count,
        has_sub_panel: formData.has_sub_panel,
        sub_panel_rating: formData.sub_panel_rating,
        sub_panel_breaker_space: formData.sub_panel_breaker_space,
        sub_panel_bus_bar_rating: formData.sub_panel_bus_bar_rating,
        panel_brand: formData.panel_brand,
        panel_model: formData.panel_model,
        panel_year: formData.panel_year,
        panel_notes: formData.panel_notes,
        utility_meter_on_wall: formData.utility_meter_on_wall,
        has_generators: formData.has_generators,
        has_existing_system: formData.has_existing_system,
        existing_system_type: formData.existing_system_type,
        existing_inverter_count: formData.existing_inverter_count,
        existing_panel_count: formData.existing_panel_count,
        existing_battery_count: formData.existing_battery_count,
        has_hoa: formData.has_hoa,
        has_wifi: formData.has_wifi,
        additional_notes: formData.additional_notes,
        ground_mount_video: formData.ground_mount_video,
        trenching_type: formData.trenching_type,
      };

      // Pass the raw files to the service
      const result = await this.surveyFormService.submitSurvey(
        dealerId,
        createSurveyDto,
        files
      );

      return { success: true, data: result };
    } catch (error) {
      this.logger.error('Survey submission error:', error);
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('r/:dealer_id')
  @Render('response-viewer')
  async getResponseViewer(@Param('dealer_id') dealerId: string) {
    try {
      this.logger.debug(`Getting response viewer for dealer: ${dealerId}`);
      
      const dealer = await this.surveyFormService.getDealerInfo(dealerId);
      this.logger.debug(`Found dealer: ${dealer.name}`);
      
      const surveys = await this.surveyFormService.getDealerSurveys(dealerId);
      this.logger.debug(`Found ${surveys.length} surveys`);

      if (surveys.length > 0) {
        this.logger.debug('Sample survey data:', surveys[0]);
      }

      return {
        title: dealer.name,
        logo: dealer.logo || null,
        dealerId: dealer.dealer_id,
        dealerName: dealer.name,
        reps: dealer.reps || [''],
        surveys: surveys.map(survey => ({
          id: survey.id,
          customer_name: survey.customer_name,
          customer_address: survey.customer_address,
          rep_name: survey.rep_name,
          created_at: survey.created_at,
          // Include all form fields
          description: survey.response_data?.description,
          has_attic: survey.response_data?.has_attic,
          roof_type: survey.response_data?.roof_type,
          stored_items_in_attic: survey.response_data?.stored_items_in_attic,
          panel_location: survey.response_data?.panel_location,
          main_panel_rating: survey.response_data?.main_panel_rating,
          bus_bar_rating: survey.response_data?.bus_bar_rating,
          extra_breaker_space: survey.response_data?.extra_breaker_space,
          breaker_spots_count: survey.response_data?.breaker_spots_count,
          has_sub_panel: survey.response_data?.has_sub_panel,
          sub_panel_rating: survey.response_data?.sub_panel_rating,
          sub_panel_breaker_space: survey.response_data?.sub_panel_breaker_space,
          sub_panel_bus_bar_rating: survey.response_data?.sub_panel_bus_bar_rating,
          panel_brand: survey.response_data?.panel_brand,
          panel_model: survey.response_data?.panel_model,
          panel_year: survey.response_data?.panel_year,
          panel_notes: survey.response_data?.panel_notes,
          utility_meter_on_wall: survey.response_data?.utility_meter_on_wall,
          has_generators: survey.response_data?.has_generators,
          has_existing_system: survey.response_data?.has_existing_system,
          existing_system_type: survey.response_data?.existing_system_type,
          existing_inverter_count: survey.response_data?.existing_inverter_count,
          existing_panel_count: survey.response_data?.existing_panel_count,
          existing_battery_count: survey.response_data?.existing_battery_count,
          has_hoa: survey.response_data?.has_hoa,
          has_wifi: survey.response_data?.has_wifi,
          additional_notes: survey.response_data?.additional_notes,
          trenching_type: survey.response_data?.trenching_type,
          // Include all photo arrays
          roof_condition_photos: survey.response_data?.roof_condition_photos || [],
          roof_tilt_photos: survey.response_data?.roof_tilt_photos || [],
          roof_all_sides_photos: survey.response_data?.roof_all_sides_photos || [],
          main_panel_photos: survey.response_data?.main_panel_photos || [],
          attic_photos: survey.response_data?.attic_photos || [],
          rafter_depth_photos: survey.response_data?.rafter_depth_photos || [],
          rafter_spacing_photos: survey.response_data?.rafter_spacing_photos || [],
          panel_surrounding_photos: survey.response_data?.panel_surrounding_photos || [],
          panel_breakers_photos: survey.response_data?.panel_breakers_photos || [],
          panel_label_photos: survey.response_data?.panel_label_photos || [],
          panel_no_cover_photos: survey.response_data?.panel_no_cover_photos || [],
          main_breaker_photos: survey.response_data?.main_breaker_photos || [],
          sub_panel_photos: survey.response_data?.sub_panel_photos || [],
          utility_meter_close_photos: survey.response_data?.utility_meter_close_photos || [],
          utility_meter_far_photos: survey.response_data?.utility_meter_far_photos || [],
          existing_microinverter_photos: survey.response_data?.existing_microinverter_photos || [],
          existing_panel_sticker_photos: survey.response_data?.existing_panel_sticker_photos || [],
          existing_extra_equipment_photos: survey.response_data?.existing_extra_equipment_photos || [],
          front_house_photos: survey.response_data?.front_house_photos || [],
          back_house_photos: survey.response_data?.back_house_photos || [],
          left_house_photos: survey.response_data?.left_house_photos || [],
          right_house_photos: survey.response_data?.right_house_photos || [],
          front_mail_number_photos: survey.response_data?.front_mail_number_photos || [],
          ground_mount_location_photos: survey.response_data?.ground_mount_location_photos || [],
          ground_mount_distance_photos: survey.response_data?.ground_mount_distance_photos || [],
          ground_mount_video: survey.response_data?.ground_mount_video || null,
        }))
      };
    } catch (error) {
      this.logger.error(`Error in getResponseViewer: ${error.message}`);
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
  }
}
