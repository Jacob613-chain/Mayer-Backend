import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './survey.entity';
import { S3Service } from '../s3/s3.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SearchSurveyDto } from './dto/search-survey.dto';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    private s3Service: S3Service,
  ) {}

  async create(createSurveyDto: CreateSurveyDto, files: Express.Multer.File[] = []) {
    try {
      const surveyData = {
        ...createSurveyDto,
        response_data: JSON.parse(createSurveyDto.response_data)
      };
      const survey = this.surveyRepository.create(surveyData);
      const savedSurvey = await this.surveyRepository.save(survey);

      if (files.length > 0) {
        const uploadPromises = files.map(file => 
          this.s3Service.uploadFile(file, `surveys/${savedSurvey.id}`).catch((error: Error) => {
            this.logger.error(`Failed to upload survey image: ${error.message}`);
            throw error;
          })
        );

        const fileUrls = await Promise.all(uploadPromises);

        // Update response_data with file URLs
        const responseData = savedSurvey.response_data || {};
        files.forEach((file, index) => {
          const questionId = file.fieldname.split('_')[0];
          if (!responseData[questionId]) {
            responseData[questionId] = [];
          }
          responseData[questionId].push(fileUrls[index]);
        });

        savedSurvey.response_data = responseData;
        await this.surveyRepository.save(savedSurvey);
      }

      return savedSurvey;
    } catch (error) {
      this.logger.error(`Failed to create survey: ${error.message}`);
      throw error;
    }
  }

  async search(searchDto: SearchSurveyDto) {
    const query = this.surveyRepository.createQueryBuilder('survey');

    // Start with a base condition
    let hasWhereCondition = false;

    if (searchDto.id) {
      query.where('survey.id = :id', { id: searchDto.id });
      hasWhereCondition = true;
    }

    if (searchDto.search) {
      if (hasWhereCondition) {
        query.andWhere(
          '(survey.customer_name ILIKE :search OR survey.customer_address ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
      } else {
        query.where(
          '(survey.customer_name ILIKE :search OR survey.customer_address ILIKE :search)',
          { search: `%${searchDto.search}%` }
        );
        hasWhereCondition = true;
      }
    }

    if (searchDto.dealer_id) {
      if (hasWhereCondition) {
        query.andWhere('survey.dealer_id = :dealer_id', { dealer_id: searchDto.dealer_id });
      } else {
        query.where('survey.dealer_id = :dealer_id', { dealer_id: searchDto.dealer_id });
        hasWhereCondition = true;
      }
    }

    if (searchDto.rep_name) {
      if (hasWhereCondition) {
        query.andWhere('survey.rep_name ILIKE :rep_name', { rep_name: `%${searchDto.rep_name}%` });
      } else {
        query.where('survey.rep_name ILIKE :rep_name', { rep_name: `%${searchDto.rep_name}%` });
      }
    }

    if (searchDto.include_dealer_info) {
      query.leftJoinAndSelect('survey.dealer', 'dealer');
    }

    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);
    query.orderBy('survey.created_at', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
