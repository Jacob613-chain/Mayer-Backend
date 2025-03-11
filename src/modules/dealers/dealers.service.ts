import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from './dealer.entity';
import { S3Service } from '../s3/s3.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    @InjectRepository(Dealer)
    private dealersRepository: Repository<Dealer>,
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
      const dealer = await this.dealersRepository.findOne({ where: { id } });
      if (!dealer) {
        throw new NotFoundException(`Dealer with ID "${id}" not found`);
      }

      await this.dealersRepository.delete(id);
    } catch (error) {
      this.logger.error(`Failed to delete dealer: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete dealer');
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

  async findByDealerId(dealerId: string): Promise<Dealer> {
    try {
      const dealer = await this.dealersRepository.findOne({
        where: { dealer_id: dealerId },
        select: ['id', 'dealer_id', 'name', 'logo', 'reps']
      });

      if (!dealer) {
        throw new NotFoundException(`Dealer with dealer_id "${dealerId}" not found`);
      }

      return dealer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch dealer by dealer_id: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dealer');
    }
  }
}
