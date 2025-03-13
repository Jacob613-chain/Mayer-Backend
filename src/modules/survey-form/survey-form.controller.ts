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

      // Initialize response data object
      const responseData = {};

      // Process all form fields
      for (const [key, value] of Object.entries(formData)) {
        if (key !== 'dealer_id' && key !== 'rep_name' && 
            key !== 'customer_name' && key !== 'customer_address') {
          // Handle arrays (like radio buttons and selects)
          if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            responseData[cleanKey] = Array.isArray(value) ? value : [value];
          } else {
            responseData[key] = value;
          }
        }
      }

      // Process uploaded files
      if (files.length > 0) {
        const uploadPromises = files.map(file => {
          const questionId = file.fieldname.split('_')[0];
          return this.surveyFormService.uploadFile(file, dealerId, questionId);
        });

        const uploadedUrls = await Promise.all(uploadPromises);

        // Group URLs by question ID
        uploadedUrls.forEach((url, index) => {
          const questionId = files[index].fieldname.split('_')[0];
          if (!responseData[questionId]) {
            responseData[questionId] = [];
          }
          responseData[questionId].push(url);
        });
      }

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
