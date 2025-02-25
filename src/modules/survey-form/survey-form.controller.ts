import { Controller, Get, Param, Render, NotFoundException } from '@nestjs/common';
import { SurveyFormService } from './survey-form.service';

@Controller('dealers')
export class SurveyFormController {
  constructor(private readonly surveyFormService: SurveyFormService) {}

  @Get(':dealer_id')
  @Render('survey-form')
  async getSurveyForm(@Param('dealer_id') dealerId: string) {
    const dealer = await this.surveyFormService.getDealerInfo(dealerId);
    
    if (!dealer) {
      throw new NotFoundException(`Dealer with ID "${dealerId}" not found`);
    }
    
    return {
      title: dealer.name,
      logo: dealer.logo,
      dealerId: dealer.dealer_id
    };
  }
}
