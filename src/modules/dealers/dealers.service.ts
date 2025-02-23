import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from './dealer.entity';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    @InjectRepository(Dealer)
    private dealersRepository: Repository<Dealer>,
    private googleDriveService: GoogleDriveService,
  ) {}

  async create(createDealerDto: CreateDealerDto, logo?: Express.Multer.File): Promise<Dealer> {
    const dealer = this.dealersRepository.create(createDealerDto);

    if (logo) {
      const logoUrl = await this.googleDriveService.uploadFile(logo, 'dealer-logos');
      dealer.logo = logoUrl;
    }

    return this.dealersRepository.save(dealer);
  }

  async update(id: string, updateDealerDto: UpdateDealerDto, logo?: Express.Multer.File): Promise<Dealer> {
    try {
      this.logger.debug(`Attempting to update dealer with ID: ${id}`);
      this.logger.debug('Update DTO:', updateDealerDto);
      
      const dealer = await this.dealersRepository.findOne({ 
        where: { id },
        select: ['id', 'dealer_id', 'name', 'logo', 'reps']
      });
      
      if (!dealer) {
        throw new NotFoundException(`Dealer with ID "${id}" not found`);
      }

      // Update basic fields if provided
      if (updateDealerDto.name) dealer.name = updateDealerDto.name;
      
      // Handle reps update
      if (updateDealerDto.reps !== undefined) {
        // Ensure reps is always a string array
        let processedReps: string[];
        
        if (Array.isArray(updateDealerDto.reps)) {
          processedReps = updateDealerDto.reps.map(String);
        } else if (typeof updateDealerDto.reps === 'string') {
          try {
            const parsed = JSON.parse(updateDealerDto.reps);
            processedReps = Array.isArray(parsed) ? parsed.map(String) : [updateDealerDto.reps];
          } catch {
            processedReps = [updateDealerDto.reps];
          }
        } else {
          processedReps = [String(updateDealerDto.reps)];
        }
        
        dealer.reps = processedReps;
        this.logger.debug('Processed reps array:', dealer.reps);
      }

      // Handle logo upload if provided
      if (logo) {
        const logoUrl = await this.googleDriveService.uploadFile(logo, 'dealer-logos');
        dealer.logo = logoUrl;
      }

      const updatedDealer = await this.dealersRepository.save(dealer);
      this.logger.debug('Successfully updated dealer:', updatedDealer);
      return updatedDealer;
      
    } catch (error) {
      this.logger.error('Error updating dealer:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update dealer');
    }
  }

  async findAll(): Promise<Dealer[]> {
    const dealers = await this.dealersRepository.find();
    console.log('All dealers:', dealers);
    return dealers;
  }

  async findOne(id: string): Promise<Dealer> {
    console.log('Finding dealer with ID:', id);
    const dealer = await this.dealersRepository.findOne({ 
      where: { id },
      select: ['id', 'dealer_id', 'name', 'logo', 'reps']
    });
    console.log('Found dealer:', dealer);
    
    if (!dealer) {
      throw new NotFoundException(`Dealer with ID "${id}" not found`);
    }

    // Ensure reps is always an array
    if (dealer.reps && typeof dealer.reps === 'string') {
      try {
        const parsedReps = JSON.parse(dealer.reps as string);
        dealer.reps = Array.isArray(parsedReps) ? parsedReps : [parsedReps];
      } catch (e) {
        dealer.reps = Array.isArray(dealer.reps) ? dealer.reps : [dealer.reps];
      }
    }
    
    return dealer;
  }

  async delete(id: string): Promise<void> {
    const dealer = await this.findOne(id);
    await this.dealersRepository.remove(dealer);
  }
} 
