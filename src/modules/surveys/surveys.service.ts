import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Survey } from './survey.entity';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SearchSurveyDto } from './dto/search-survey.dto';
import { generateFolderName } from '../google-drive/utils/folder-naming.util';
import { CompressionService } from '../compression/compression.service';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    private googleDriveService: GoogleDriveService,
    private compressionService: CompressionService,
  ) {}

  async create(createSurveyDto: CreateSurveyDto, files: Express.Multer.File[]) {
    const { response_data, ...surveyData } = createSurveyDto;
    const processedData = { ...JSON.parse(response_data) };

    // Upload to Google Drive with compression
    const fileUrls = await this.uploadFilesToDrive(
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
    const query = this.surveyRepository.createQueryBuilder('survey');

    if (searchDto.search) {
      query.where([
        { customer_name: ILike(`%${searchDto.search}%`) },
        { customer_address: ILike(`%${searchDto.search}%`) },
      ]);
    }

    if (searchDto.dealer_id) {
      query.andWhere('survey.dealer_id = :dealerId', { dealerId: searchDto.dealer_id });
    }

    if (searchDto.rep_name) {
      query.andWhere('survey.rep_name = :repName', { repName: searchDto.rep_name });
    }

    query.orderBy('survey.created_at', 'DESC');

    return query.getMany();
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

  private async uploadFilesToDrive(
    files: Express.Multer.File[],
    customerName: string,
    repName: string,
  ): Promise<string[]> {
    const folderName = generateFolderName(customerName, repName);
    
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
      const uploadPromises = compressedFiles.map((compressedFile, index) =>
        this.googleDriveService.uploadCompressedFile(
          files[index],
          folderName,
          compressedFile.buffer,
          compressedFile.originalname
        )
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error(
        `Failed to process and upload files to Google Drive for ${customerName}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
} 
