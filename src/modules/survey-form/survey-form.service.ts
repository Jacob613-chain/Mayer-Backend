import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { SurveysService } from '../surveys/surveys.service';
import { DealersService } from '../dealers/dealers.service';
import { CreateSurveyDto } from '../surveys/dto/create-survey.dto';

@Injectable()
export class SurveyFormService {
  private readonly logger = new Logger(SurveyFormService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly surveysService: SurveysService,
    private readonly dealersService: DealersService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    dealerId: string,
    questionId: string
  ): Promise<string> {
    try {
      const path = `surveys/${dealerId}/${questionId}`;
      return await this.s3Service.uploadFile(file, path);
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  async submitSurvey(
    dealerId: string,
    formData: CreateSurveyDto,
    files: Express.Multer.File[]
  ) {
    try {
      // Verify dealer exists
      await this.dealersService.findByDealerId(dealerId);

      // Create survey with response data
      const result = await this.surveysService.create(formData, files);
      return result;
    } catch (error) {
      this.logger.error(`Failed to submit survey: ${error.message}`);
      throw error;
    }
  }

  async getDealerSurveys(dealerId: string) {
    try {
      // Use the surveysService to get all responses for the dealer
      const surveys = await this.surveysService.getDealerResponses(dealerId);
      
      if (!surveys || surveys.length === 0) {
        this.logger.debug(`No surveys found for dealer ${dealerId}`);
        return [];
      }

      this.logger.debug(`Found ${surveys.length} surveys for dealer ${dealerId}`);
      return surveys;
    } catch (error) {
      this.logger.error(`Error getting dealer surveys: ${error.message}`);
      throw error;
    }
  }

  async getDealerInfo(dealerId: string) {
    try {
      return await this.dealersService.findByDealerId(dealerId);
    } catch (error) {
      this.logger.error(`Failed to get dealer info: ${error.message}`);
      throw error;
    }
  }
}
