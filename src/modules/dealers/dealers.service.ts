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

  async create(createDealerDto: CreateDealerDto, logo?: Express.Multer.File): Promise<Dealer> {
    const dealer = this.dealersRepository.create({
      ...createDealerDto,
      reps: createDealerDto.reps || [""] // Initialize with empty string if not provided
    });

    if (logo) {
      const logoUrl = await this.s3Service.uploadFile(logo, 'dealer-logos');
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
        // Clean handling of reps
        let processedReps: string[] = [];
        
        if (Array.isArray(updateDealerDto.reps)) {
          // If it's already an array, use it directly
          processedReps = updateDealerDto.reps.map(String);
        } else if (typeof updateDealerDto.reps === 'string') {
          try {
            // Check if it's a JSON string that looks like an array
            const cleanString = (updateDealerDto.reps as string).replace(/^"+|"+$/g, '');
            
            // Check if it's a PostgreSQL array format like "{\"qw\",\"wer\",\"wet\",\"qwe\"}"
            if (cleanString.startsWith('{') && cleanString.endsWith('}')) {
              // Parse PostgreSQL array format
              const content = cleanString.slice(1, -1); // Remove { and }
              processedReps = content
                .split(',')
                .map(item => item.replace(/^\\"|\\"|"/g, '').trim()) // Remove escaped quotes
                .filter(item => item.length > 0);
            } else {
              // Try regular JSON parsing
              try {
                const parsed = JSON.parse(cleanString);
                if (Array.isArray(parsed)) {
                  processedReps = parsed.map(String);
                } else {
                  processedReps = [cleanString];
                }
              } catch {
                processedReps = [cleanString];
              }
            }
          } catch {
            processedReps = [updateDealerDto.reps];
          }
        }
        
        // Ensure we have at least an empty string if array is empty
        if (processedReps.length === 0) {
          processedReps = [""];
        }
        
        dealer.reps = processedReps;
        this.logger.debug('Processed reps array:', dealer.reps);
      }

      // Handle logo upload if provided
      if (logo) {
        const logoUrl = await this.s3Service.uploadFile(logo, 'dealer-logos');
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
    
    // Ensure each dealer has at least an empty string in reps array
    dealers.forEach(dealer => {
      if (!dealer.reps || dealer.reps.length === 0) {
        dealer.reps = [""];
      }
    });
    
    return dealers;
  }

  async findOne(id: string): Promise<Dealer> {
    const dealer = await this.dealersRepository.findOne({ 
      where: { id },
      select: ['id', 'dealer_id', 'name', 'logo', 'reps']
    });
    
    if (!dealer) {
      throw new NotFoundException(`Dealer with ID "${id}" not found`);
    }

    // Ensure reps is always an array with at least an empty string
    if (!dealer.reps || dealer.reps.length === 0) {
      dealer.reps = [""];
    } else if (typeof dealer.reps === 'string') {
      try {
        const parsedReps = JSON.parse(dealer.reps as string);
        dealer.reps = Array.isArray(parsedReps) ? parsedReps : [parsedReps];
        if (dealer.reps.length === 0) {
          dealer.reps = [""];
        }
      } catch {
        dealer.reps = [dealer.reps as unknown as string];
      }
    }

    return dealer;
  }

  async findByDealerId(dealerId: string): Promise<Dealer> {
    this.logger.debug(`Attempting to find dealer with dealer_id: ${dealerId}`);
    
    const dealer = await this.dealersRepository.findOne({ 
      where: { dealer_id: dealerId },
      select: ['id', 'dealer_id', 'name', 'logo', 'reps']
    });
    
    this.logger.debug(`Search result for dealer_id ${dealerId}:`, dealer);
    
    if (!dealer) {
      this.logger.warn(`Dealer with dealer_id "${dealerId}" not found`);
      throw new NotFoundException(`Dealer with dealer_id "${dealerId}" not found`);
    }

    // Ensure reps is always an array with at least an empty string
    if (!dealer.reps || dealer.reps.length === 0) {
      dealer.reps = [""];
    }

    return dealer;
  }

  async delete(id: string): Promise<void> {
    const result = await this.dealersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Dealer with ID "${id}" not found`);
    }
  }
}
