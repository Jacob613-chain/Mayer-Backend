import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DealersService } from '../dealers/dealers.service';
import { SurveysService } from '../surveys/surveys.service';

@Injectable()
export class SurveyFormService {
  submitSurvey(dealerId: string, formData: any, files: Express.Multer.File[]) {
    throw new Error('Method not implemented.');
  }
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

  // ... rest of your service methods
}
