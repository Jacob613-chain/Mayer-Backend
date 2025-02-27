import { Controller, Get, Post, Param, Render, NotFoundException, Body, UseInterceptors, UploadedFiles, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SurveyFormService } from './survey-form.service';
import { CreateSurveyDto } from '../surveys/dto/create-survey.dto';

@Controller('')  // Empty string to handle root routes
export class SurveyFormController {
  constructor(private readonly surveyFormService: SurveyFormService) {}

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

  @Post(':dealer_id/submit')
  @UseInterceptors(FilesInterceptor('photos'))
  async submitSurvey(
    @Param('dealer_id') dealerId: string,
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      const result = await this.surveyFormService.submitSurvey(dealerId, formData, files);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }
}
