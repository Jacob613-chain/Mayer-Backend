import { Injectable, NotFoundException, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from './dealer.entity';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { UploadFailedException } from '../../common/exceptions/upload.exception';

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    @InjectRepository(Dealer)
    private dealersRepository: Repository<Dealer>,
    private googleDriveService: GoogleDriveService,
  ) { }

  async create(createDealerDto: CreateDealerDto, logoFile?: Express.Multer.File): Promise<Dealer> {
    try {
      // First check if dealer_id already exists
      const existingDealer = await this.dealersRepository.findOne({
        where: { dealer_id: createDealerDto.dealer_id }
      });

      if (existingDealer) {
        throw new BadRequestException(`Dealer with dealer_id "${createDealerDto.dealer_id}" already exists`);
      }

      let logoUrl: string | undefined;

      if (logoFile) {
        this.logger.debug('Processing logo file:', {
          originalname: logoFile.originalname,
          mimetype: logoFile.mimetype,
          size: logoFile.size,
          buffer: logoFile.buffer ? 'Buffer present' : 'No buffer'
        });

        try {
          logoUrl = await this.googleDriveService.uploadFile(
            logoFile,
            'dealer-logos'
          );

          if (!logoUrl) {
            throw new Error('Upload succeeded but no URL was returned');
          }

          this.logger.debug('Logo uploaded successfully:', logoUrl);
        } catch (error) {
          this.logger.error('Failed to upload logo:', error);
          if (error instanceof UploadFailedException) {
            throw new BadRequestException('Failed to upload logo: Invalid file format or corrupted image');
          }
          throw new InternalServerErrorException('Failed to upload logo to storage');
        }
      }

      const dealer = this.dealersRepository.create({
        ...createDealerDto,
        logo: logoUrl || null,
        reps: createDealerDto.reps || [""]
      });

      const savedDealer = await this.dealersRepository.save(dealer);
      this.logger.debug('Dealer saved with data:', {
        id: savedDealer.id,
        dealer_id: savedDealer.dealer_id,
        logo: savedDealer.logo
      });

      return savedDealer;
    } catch (error) {
      this.logger.error(`Failed to create dealer: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create dealer');
    }
  }

  async update(id: string, updateDealerDto: UpdateDealerDto, logoFile?: Express.Multer.File): Promise<Dealer> {
    try {
      const dealer = await this.dealersRepository.findOne({
        where: { id },
        select: ['id', 'dealer_id', 'name', 'logo', 'reps']
      });

      if (!dealer) {
        throw new NotFoundException(`Dealer with ID "${id}" not found`);
      }

      let logoUrl = dealer.logo;
      if (logoFile) {
        try {
          // Delete existing logo if it exists
          if (dealer.logo) {
            const fileId = dealer.logo.split('=').pop();
            try {
              await this.googleDriveService.deleteFile(fileId);
            } catch (error) {
              this.logger.warn(`Failed to delete old logo: ${error.message}`);
            }
          }

          // Upload new logo
          logoUrl = await this.googleDriveService.uploadFile(
            logoFile,
            'dealer-logos'
          );
        } catch (error) {
          this.logger.error('Failed to upload new logo:', error);
          if (error instanceof UploadFailedException) {
            throw new BadRequestException('Failed to upload logo: Invalid file format or corrupted image');
          }
          throw new InternalServerErrorException('Failed to upload logo to storage');
        }
      }

      // Update basic fields if provided
      if (updateDealerDto.name) dealer.name = updateDealerDto.name;
      dealer.logo = logoUrl;

      // Handle reps update
      if (updateDealerDto.reps !== undefined) {
        let processedReps: string[] = Array.isArray(updateDealerDto.reps)
          ? updateDealerDto.reps
          : [updateDealerDto.reps];

        // Ensure we have at least an empty string if array is empty
        if (processedReps.length === 0) {
          processedReps = [""];
        }

        dealer.reps = processedReps;
      }

      return await this.dealersRepository.save(dealer);
    } catch (error) {
      this.logger.error(`Failed to update dealer: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update dealer');
    }
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
