import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, Brackets } from 'typeorm';
import { Survey } from './survey.entity';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SearchSurveyDto } from './dto/search-survey.dto';
import { CompressionService } from '../compression/compression.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { Dealer } from '../dealers/dealer.entity';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    private compressionService: CompressionService,
    private googleDriveService: GoogleDriveService,
  ) {}

  private async uploadFilesToS3(
    files: Express.Multer.File[],
    customerName: string,
    repName: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const folderName = `surveys/${customerName}-${repName}-${Date.now()}`;
    
    try {
      // Compress all images
      const compressedFiles = await this.compressionService.compressImageBatch(
        files,
        {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 80,
          format: 'jpeg',
        }
      );

      // Upload compressed files
      const uploadPromises = compressedFiles.map((compressedFile, index) => {
        // Create a modified file object with the compressed buffer
        const modifiedFile: Express.Multer.File = {
          ...files[index],
          buffer: compressedFile.buffer,
          originalname: compressedFile.originalname
        };
        
        return this.googleDriveService.uploadFile(modifiedFile, folderName);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error(
        `Failed to process and upload files for ${customerName}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async create(createSurveyDto: CreateSurveyDto, files: Express.Multer.File[] = []) {
    const { response_data, ...surveyData } = createSurveyDto;
    let processedData: Record<string, any>;

    try {
      processedData = JSON.parse(response_data);
    } catch (error) {
      this.logger.error('Failed to parse response_data:', error);
      throw new Error('Invalid response_data format');
    }

    // Upload files if any
    if (files.length > 0) {
      const fileUrls = await this.uploadFilesToS3(
        files,
        createSurveyDto.customer_name,
        createSurveyDto.rep_name
      );

      // Store URLs in processedData
      files.forEach((file, index) => {
        const questionId = file.fieldname.split('_')[0];
        if (!processedData[questionId]) {
          processedData[questionId] = [];
        }
        processedData[questionId].push(fileUrls[index]);
      });
    }

    // Create and save survey
    const survey = this.surveyRepository.create({
      ...surveyData,
      response_data: processedData,
    });

    try {
      const savedSurvey = await this.surveyRepository.save(survey);
      this.logger.debug('Survey saved successfully:', savedSurvey.id);
      return savedSurvey;
    } catch (error) {
      this.logger.error('Failed to save survey:', error);
      throw error;
    }
  }

  async search(searchDto: SearchSurveyDto) {
    this.logger.debug(`Searching surveys with criteria: ${JSON.stringify(searchDto)}`);
    
    // First, let's check if the dealer exists and show its details
    const dealer = await this.surveyRepository.manager.getRepository(Dealer)
      .findOne({ where: { dealer_id: searchDto.dealer_id } });
    this.logger.debug(`Found dealer: ${JSON.stringify(dealer)}`);
    
    // Let's check all surveys in the database
    const allSurveys = await this.surveyRepository.find();
    this.logger.debug(`All surveys in database: ${JSON.stringify(allSurveys.map(s => ({
      id: s.id,
      dealer_id: s.dealer_id,
      customer_name: s.customer_name
    })))}`);
    
    const query = this.surveyRepository.createQueryBuilder('survey');
    
    // Join with dealer to get dealer information
    query.leftJoinAndSelect('survey.dealer', 'dealer');

    // Filter by dealer_id
    if (searchDto.dealer_id && searchDto.dealer_id.trim()) {
      query.andWhere('survey.dealer_id = :dealerId', { 
        dealerId: searchDto.dealer_id.trim() 
      });
      // Add debug log for this specific filter
      this.logger.debug(`Filtering by dealer_id: ${searchDto.dealer_id.trim()}`);
    }

    // Filter by rep_name
    if (searchDto.rep_name && searchDto.rep_name.trim()) {
      query.andWhere('survey.rep_name ILIKE :repName', { 
        repName: `%${searchDto.rep_name.trim()}%` 
      });
      // Add debug log for this specific filter
      this.logger.debug(`Filtering by rep_name: ${searchDto.rep_name.trim()}`);
    }

    // Add pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const skip = (page - 1) * limit;
    
    query.skip(skip).take(limit);
    query.orderBy('survey.created_at', 'DESC');

    try {
      // Log the raw SQL query and parameters
      const rawQuery = query.getQueryAndParameters();
      this.logger.debug('Raw SQL query:', rawQuery[0]);
      this.logger.debug('Query parameters:', rawQuery[1]);

      const [surveys, total] = await query.getManyAndCount();
      
      this.logger.debug(`Found ${total} surveys matching criteria`);
      this.logger.debug('Matching surveys:', JSON.stringify(surveys.map(s => ({
        id: s.id,
        dealer_id: s.dealer_id,
        customer_name: s.customer_name
      }))));
      
      return {
        data: surveys,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error(`Error searching surveys: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    const survey = await this.surveyRepository.findOne({
      where: { id },
      relations: ['dealer'],
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }
}
