import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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
      // Validate required fields
      if (!createSurveyDto.dealer_id) {
        throw new BadRequestException('dealer_id is required');
      }
      if (!createSurveyDto.customer_name) {
        throw new BadRequestException('customer_name is required');
      }
      if (!createSurveyDto.customer_address) {
        throw new BadRequestException('customer_address is required');
      }
      if (!createSurveyDto.rep_name) {
        throw new BadRequestException('rep_name is required');
      }

      // Create the form payload object
      const formPayload: any = {
        ...createSurveyDto,
        // Initialize photo arrays based on fieldnames from files
        roof_condition_photos: [],
        roof_tilt_photos: [],
        roof_all_sides_photos: [],
        main_panel_photos: [],
        attic_photos: [],
        rafter_depth_photos: [],
        rafter_spacing_photos: [],
        panel_surrounding_photos: [],
        panel_breakers_photos: [],
        panel_label_photos: [],
        panel_no_cover_photos: [],
        main_breaker_photos: [],
        sub_panel_photos: [],
        utility_meter_close_photos: [],
        utility_meter_far_photos: [],
        existing_microinverter_photos: [],
        existing_panel_sticker_photos: [],
        existing_extra_equipment_photos: [],
        front_house_photos: [],
        back_house_photos: [],
        left_house_photos: [],
        right_house_photos: [],
        front_mail_number_photos: []
      };

      // Group files by their fieldnames
      const groupedFiles = files.reduce((acc, file) => {
        // Remove the '[]' from fieldname if present
        const cleanFieldname = file.fieldname.replace('[]', '');
        if (!acc[cleanFieldname]) {
          acc[cleanFieldname] = [];
        }
        acc[cleanFieldname].push(file);
        return acc;
      }, {});

      // Upload files and update formPayload
      for (const [fieldname, fieldFiles] of Object.entries(groupedFiles)) {
        const uploadPromises = (fieldFiles as Express.Multer.File[]).map((file: Express.Multer.File) => 
          this.s3Service.uploadFile(file, `surveys/${createSurveyDto.dealer_id}`)
        );

        try {
          const urls = await Promise.all(uploadPromises);
          // Update the corresponding array in formPayload
          formPayload[fieldname] = urls;
        } catch (error) {
          this.logger.error(`Failed to upload ${fieldname} images: ${error.message}`);
          throw new BadRequestException(`Failed to upload ${fieldname} images`);
        }
      }

      // Create and save the survey
      const survey = this.surveyRepository.create({
        dealer_id: createSurveyDto.dealer_id,
        customer_name: createSurveyDto.customer_name,
        customer_address: createSurveyDto.customer_address,
        rep_name: createSurveyDto.rep_name,
        response_data: formPayload
      });

      const savedSurvey = await this.surveyRepository.save(survey);
      
      this.logger.debug('Saved survey response data:', savedSurvey.response_data);
      return savedSurvey;

    } catch (error) {
      this.logger.error('Failed to create survey:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to create survey');
    }
  }

  async search(searchDto: SearchSurveyDto) {
    const query = this.surveyRepository.createQueryBuilder('survey')
      .leftJoinAndSelect('survey.dealer', 'dealer');  // Always join with dealer table

    if (searchDto.id) {
      query.andWhere('survey.id = :id', { id: searchDto.id });
    }

    if (searchDto.customer_name) {
      query.andWhere('survey.customer_name ILIKE :customer_name', { 
        customer_name: `%${searchDto.customer_name}%` 
      });
    }

    if (searchDto.customer_address) {
      query.andWhere('survey.customer_address ILIKE :customer_address', { 
        customer_address: `%${searchDto.customer_address}%` 
      });
    }

    if (searchDto.dealer_id) {
      query.andWhere('survey.dealer_id = :dealer_id', { dealer_id: searchDto.dealer_id });
    }

    if (searchDto.dealer_name) {
      query.andWhere('dealer.name ILIKE :dealer_name', { 
        dealer_name: `%${searchDto.dealer_name}%` 
      });
    }

    if (searchDto.rep_name) {
      query.andWhere('survey.rep_name ILIKE :rep_name', { 
        rep_name: `%${searchDto.rep_name}%` 
      });
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

  async getDealerResponses(dealerId: string) {
    try {
      const surveys = await this.surveyRepository.find({
        where: { dealer_id: dealerId },
        select: [
          'id',
          'dealer_id',
          'customer_name',
          'customer_address',
          'rep_name',
          'created_at',
          'response_data',
          'form_payload'
        ],
        order: {
          created_at: 'DESC'
        }
      });

      return surveys;
    } catch (error) {
      this.logger.error(`Failed to get dealer responses: ${error.message}`);
      throw error;
    }
  }

  async findOne(numericId: number) {
    try {
      const survey = await this.surveyRepository.findOne({
        where: { id: numericId },
        relations: ['dealer'],
      });

      if (!survey) {
        throw new NotFoundException(`Survey with ID ${numericId} not found`);
      }

      return survey;
    } catch (error) {
      this.logger.error(`Failed to find survey: ${error.message}`);
      throw error;
    }
  }

  async findByDealerAndCustomer(dealerId: string, customerName: string, customerAddress: string) {
    try {
      const survey = await this.surveyRepository.findOne({
        where: {
          dealer_id: dealerId,
          customer_name: customerName,
          customer_address: customerAddress
        },
        relations: ['dealer']
      });

      if (!survey) {
        throw new NotFoundException('Survey not found');
      }

      return survey;
    } catch (error) {
      this.logger.error(`Failed to find survey: ${error.message}`);
      throw error;
    }
  }
}
