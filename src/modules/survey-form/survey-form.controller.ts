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
        logo: dealer.logo,
        dealerId: dealer.dealer_id,
        dealerName: dealer.name,
        reps: dealer.reps || ['']
      };
    } catch (error) {
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
  }

  @Post('surveys')
  @UseInterceptors(FilesInterceptor('photos', 20)) // Allow up to 20 photos
  async submitSurvey(
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      const dealerId = formData.dealer_id;
      if (!dealerId) {
        throw new BadRequestException('dealer_id is required');
      }

      // Process the response data
      const responseData = {};
      const photoFields = [
        'roof_condition_photos',
        'roof_tilt_photos',
        'roof_all_sides_photos',
        // ... other photo fields
      ];

      // Process uploaded URLs for each photo field
      photoFields.forEach(field => {
        const urlsKey = `${field}_urls`;
        if (formData[urlsKey]) {
          try {
            responseData[field] = JSON.parse(formData[urlsKey]);
          } catch (e) {
            this.logger.warn(`Failed to parse ${urlsKey}: ${e.message}`);
          }
        }
      });

      // Create survey DTO
      const createSurveyDto: CreateSurveyDto = {
        dealer_id: dealerId,
        rep_name: formData.rep_name,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        response_data: JSON.stringify(responseData)
      };

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

      return {
        title: `${dealer.name} - Survey Responses`,
        dealer: dealer,
        surveys: surveys
      };
    } catch (error) {
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
  }
}
