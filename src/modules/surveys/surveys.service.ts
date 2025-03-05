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
        `Failed to process and upload files to S3 for ${customerName}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async create(createSurveyDto: CreateSurveyDto, files: Express.Multer.File[]) {
    const { response_data, ...surveyData } = createSurveyDto;
    const processedData = { ...JSON.parse(response_data) };

    // Upload to S3 with compression
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

    // Create and save survey
    const survey = this.surveyRepository.create({
      ...surveyData,
      response_data: processedData,
    });

    return await this.surveyRepository.save(survey);
  }

  async search(searchDto: SearchSurveyDto) {
    this.logger.debug(`Searching surveys with criteria: ${JSON.stringify(searchDto)}`);
    
    const query = this.surveyRepository.createQueryBuilder('survey');
    
    // Join with dealer to get dealer information
    query.leftJoinAndSelect('survey.dealer', 'dealer');

    // Add debugging - Check what dealers exist
    const allDealers = await this.surveyRepository.manager.getRepository(Dealer).find();
    this.logger.debug(`Available dealers: ${JSON.stringify(allDealers.map(d => ({ id: d.id, dealer_id: d.dealer_id })))}`);
    
    // Add debugging - Check what surveys exist
    const allSurveys = await this.surveyRepository.find({ select: ['id', 'dealer_id'] });
    this.logger.debug(`Available surveys: ${JSON.stringify(allSurveys)}`);

    // Search in customer name or address
    if (searchDto.search && searchDto.search.trim()) {
      const searchTerm = searchDto.search.trim();
      query.andWhere(new Brackets(qb => {
        qb.where('survey.customer_name ILIKE :search', { search: `%${searchTerm}%` })
          .orWhere('survey.customer_address ILIKE :search', { search: `%${searchTerm}%` });
      }));
    }

    // Filter by dealer_id
    if (searchDto.dealer_id && searchDto.dealer_id.trim()) {
      const dealerId = searchDto.dealer_id.trim();
      
      // Check if the dealer_id is in UUID format (for dealer.id)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealerId);
      
      if (isUuid) {
        // If it's a UUID, it's likely the dealer's primary key (id)
        query.andWhere('dealer.id = :dealerId', { dealerId });
      } else {
        // Otherwise, it's the dealer_id string
        query.andWhere('survey.dealer_id = :dealerId', { dealerId });
      }
    }

    // Filter by rep_name
    if (searchDto.rep_name && searchDto.rep_name.trim()) {
      query.andWhere('survey.rep_name ILIKE :repName', { repName: `%${searchDto.rep_name.trim()}%` });
    }

    // Add pagination if needed
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const skip = (page - 1) * limit;
    
    query.skip(skip).take(limit);
    
    // Order by created_at in descending order (newest first)
    query.orderBy('survey.created_at', 'DESC');

    try {
      // Get results and count
      const [surveys, total] = await query.getManyAndCount();
      
      this.logger.debug(`Found ${total} surveys matching criteria`);
      
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
