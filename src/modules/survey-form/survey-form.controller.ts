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
        additional_notes: formData.additional_notes
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
      const dealer = await this.surveyFormService.getDealerInfo(dealerId);
      const surveys = await this.surveyFormService.getDealerSurveys(dealerId);

      // Format surveys for display
      const formattedSurveys = surveys.map(survey => ({
        id: survey.id,
        customer_name: survey.customer_name,
        customer_address: survey.customer_address,
        rep_name: survey.rep_name,
        created_at: survey.created_at,
        responses: survey.response_data
      }));

      return {
        title: `${dealer.name} - Survey Responses`,
        dealer: dealer,
        surveys: formattedSurveys
      };
    } catch (error) {
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
  }
}
