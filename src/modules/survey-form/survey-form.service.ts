import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DealersService } from '../dealers/dealers.service';
import { SurveysService } from '../surveys/surveys.service';
import { CreateSurveyDto } from '../surveys/dto/create-survey.dto';

@Injectable()
export class SurveyFormService {
  private readonly logger = new Logger(SurveyFormService.name);

  constructor(
    private readonly dealersService: DealersService,
    private readonly surveysService: SurveysService
  ) {}

  async getDealerInfo(dealerId: string) {
    try {
      this.logger.debug(`Searching for dealer with dealer_id: ${dealerId}`);
      const dealer = await this.dealersService.findByDealerId(dealerId);
      this.logger.debug('Found dealer:', dealer);
      return dealer;
    } catch (error) {
      this.logger.error('Error finding dealer:', error);
      throw error;
    }
  }

  async getDealerSurveys(dealerId: string) {
    try {
      const result = await this.surveysService.search({
        dealer_id: dealerId,
        limit: 100 // Adjust as needed
      });
      return result.data;
    } catch (error) {
      this.logger.error(`Error getting dealer surveys: ${error.message}`);
      throw error;
    }
  }

  async submitSurvey(dealerId: string, formData: CreateSurveyDto, files: Express.Multer.File[]) {
    try {
      // Verify dealer exists
      await this.dealersService.findByDealerId(dealerId);

      // Parse existing response data
      let responseData = {};
      try {
        responseData = JSON.parse(formData.response_data);
      } catch (e) {
        this.logger.warn('Failed to parse response_data, using empty object');
      }

      // Create survey with files
      const result = await this.surveysService.create({
        ...formData,
        response_data: JSON.stringify(responseData)
      }, files);
      
      this.logger.debug('Survey submitted successfully:', result);
      return result;
    } catch (error) {
      this.logger.error(`Error submitting survey: ${error.message}`);
      throw error;
    }
  }
}
