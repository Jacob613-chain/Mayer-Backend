
import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from './dealer.entity';
import { S3Service } from '../s3/s3.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { SearchDealerDto } from './dto/search-dealer.dto';
import * as crypto from 'crypto';
import { Survey } from '../surveys/survey.entity';

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    @InjectRepository(Dealer)
    private dealersRepository: Repository<Dealer>,
    @InjectRepository(Survey)
    private surveyRepository: Repository<Survey>,
    private s3Service: S3Service,
  ) {}

  async create(createDealerDto: CreateDealerDto, logoFile?: Express.Multer.File): Promise<Dealer> {
    try {
      let logoUrl: string | undefined;

      if (logoFile) {
        logoUrl = await this.s3Service.uploadDealerLogo(createDealerDto.dealer_id, logoFile);
      }

      const dealer = this.dealersRepository.create({
        ...createDealerDto,
        logo: logoUrl
      });

      return await this.dealersRepository.save(dealer);
    } catch (error) {
      this.logger.error(`Failed to create dealer: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateDealerDto: UpdateDealerDto, logoFile?: Express.Multer.File): Promise<Dealer> {
    const dealer = await this.findOne(id);

    if (logoFile) {
      // Delete old logo if exists
      if (dealer.logo) {
        await this.s3Service.deleteFile(dealer.logo);
      }

      dealer.logo = await this.s3Service.uploadDealerLogo(dealer.dealer_id, logoFile);
    }

    Object.assign(dealer, updateDealerDto);
    return await this.dealersRepository.save(dealer);
  }

  async delete(id: string): Promise<void> {
    try {
      const dealer = await this.findOne(id);
      
      // Delete logo from S3 if exists
      if (dealer.logo) {
        try {
          await this.s3Service.deleteFile(dealer.logo);
        } catch (error) {
          this.logger.warn(`Failed to delete logo from S3: ${error.message}`);
        }
      }

      await this.dealersRepository.delete(id);
    } catch (error) {
      this.logger.error(`Failed to delete dealer: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<Dealer[]> {
    try {
      return await this.dealersRepository.find({
        select: ['id', 'dealer_id', 'name', 'logo', 'reps']
      });
    } catch (error) {
      this.logger.error(`Failed to fetch dealers: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dealers');
    }
  }

  async findOne(id: string): Promise<Dealer> {
    try {
      const dealer = await this.dealersRepository.findOne({
        where: { id },
        select: ['id', 'dealer_id', 'name', 'logo', 'reps']
      });

      if (!dealer) {
        throw new NotFoundException(`Dealer with ID "${id}" not found`);
      }

      return dealer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch dealer: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dealer');
    }
  }

  async findByDealerId(
    dealerId: string, 
    customerName?: string
  ) {
    this.logger.debug(`Finding dealer with dealerId: ${dealerId} and customerName: ${customerName}`);

    // First try to find by dealer_id
    let queryBuilder = this.dealersRepository
      .createQueryBuilder('dealer')
      .leftJoinAndSelect('dealer.surveys', 'survey');

    // Check if dealerId is numeric (survey ID)
    if (/^\d+$/.test(dealerId)) {
      // If numeric, first find the survey to get its dealer_id
      const survey = await this.surveyRepository.findOne({
        where: { id: parseInt(dealerId) }
      });

      if (!survey) {
        throw new NotFoundException(`Survey with ID "${dealerId}" not found`);
      }

      // Use the survey's dealer_id
      queryBuilder = queryBuilder.where('dealer.dealer_id = :dealerId', { 
        dealerId: survey.dealer_id 
      });
    } else {
      // Use dealer_id directly if not numeric
      queryBuilder = queryBuilder.where('dealer.dealer_id = :dealerId', { 
        dealerId 
      });
    }

    // Add customer name filter if provided
    if (customerName) {
      queryBuilder.andWhere('survey.customer_name = :customerName', { 
        customerName 
      });
    }

    const dealer = await queryBuilder.getOne();

    if (!dealer) {
      throw new NotFoundException(`Dealer not found for the given ID "${dealerId}"`);
    }

    dealer.surveys = dealer.surveys || [];
    this.logger.debug(`Found dealer: ${dealer.name} with ${dealer.surveys.length} surveys`);
    return dealer;
  }

  async search(searchDto: SearchDealerDto) {
    try {
      const query = this.dealersRepository.createQueryBuilder('dealer');

      if (searchDto.search) {
        query.where('(dealer.name ILIKE :search)', { 
          search: `%${searchDto.search}%` 
        });
      }

      if (searchDto.rep_name) {
        query.andWhere(':rep_name = ANY(dealer.reps)', { 
          rep_name: searchDto.rep_name 
        });
      }

      const page = searchDto.page || 1;
      const limit = searchDto.limit || 10;
      const skip = (page - 1) * limit;

      query.skip(skip).take(limit);
      query.orderBy('dealer.created_at', 'DESC');

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
    } catch (error) {
      this.logger.error(`Failed to search dealers: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to search dealers');
    }
  }
}