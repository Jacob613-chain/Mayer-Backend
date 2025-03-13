import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { SearchDealerDto } from './dto/search-dealer.dto';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { CompressionService } from '../compression/compression.service';
import { S3Service } from '../s3/s3.service';

@Controller('dealers')
export class DealersController {
  private readonly logger = new Logger(DealersController.name);

  constructor(
    private readonly dealersService: DealersService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly compressionService: CompressionService,
    private readonly s3Service: S3Service,
  ) {}

  private formatDealerResponse(dealer: any) {
    const baseUrl = 'https://s3.us-central-1.wasabisys.com/sitesurvey-images.mayersolar.com';
    let logoUrl = null;
    
    if (dealer.logo) {
      logoUrl = dealer.logo.startsWith('http') ? dealer.logo : `${baseUrl}/${dealer.logo}`;
    }

    return {
      system_id: dealer.id,
      dealer_id: dealer.dealer_id,
      name: dealer.name,
      logo: logoUrl,
      reps: dealer.reps
    };
  }

  @Get('by-dealer-id/:dealer_id')
  async findByDealerId(@Param('dealer_id') dealerId: string) {
    this.logger.debug(`Received request for dealer_id: ${dealerId}`);
    try {
      const dealer = await this.dealersService.findByDealerId(dealerId);
      this.logger.debug(`Found dealer:`, dealer);
      return this.formatDealerResponse(dealer);
    } catch (error) {
      this.logger.error(`Error finding dealer:`, error);
      throw error;
    }
  }

  @Get()
  async findAll() {
    const dealers = await this.dealersService.findAll();
    return dealers.map(dealer => this.formatDealerResponse(dealer));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const dealer = await this.dealersService.findOne(id);
    return this.formatDealerResponse(dealer);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: (req, file, callback) => {
        if (!file) {
          callback(null, true); // Allow requests without file
          return;
        }

        // Add size validation before format check
        if (file.size > 5 * 1024 * 1024) {
          callback(new BadRequestException('File size exceeds 5MB limit'), false);
          return;
        }

        // Stricter mime type validation
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedMimes.includes(file.mimetype)) {
          callback(new BadRequestException(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
      },
    })
  )
  async create(
    @Body() createDealerDto: CreateDealerDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    this.logger.debug('Creating dealer with data:', createDealerDto);
    try {
      if (!createDealerDto.reps) {
        createDealerDto.reps = [''];
      }

      // Pass the logo file directly to the service
      const dealer = await this.dealersService.create(createDealerDto, logo);
      
      this.logger.debug('Dealer created successfully:', dealer);
      return this.formatDealerResponse(dealer);
    } catch (error) {
      this.logger.error('Failed to create dealer:', error);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create dealer');
    }
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return callback(new BadRequestException('Only image files are allowed (jpg, jpeg, png, gif)'), false);
        }
        if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/i)) {
          return callback(new BadRequestException('Invalid image format'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    })
  )
  async update(
    @Param('id') id: string,
    @Body() updateDealerDto: UpdateDealerDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    try {
      const dealer = await this.dealersService.update(id, updateDealerDto, logo);
      return this.formatDealerResponse(dealer);
    } catch (error) {
      this.logger.error('Failed to update dealer:', error);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const dealer = await this.dealersService.findOne(id);
    
    // Delete logo from S3 if it exists
    if (dealer.logo) {
      try {
        await this.s3Service.deleteFile(dealer.logo);
      } catch (error) {
        this.logger.warn(`Failed to delete logo from S3: ${error.message}`);
      }
    }

    await this.dealersService.delete(id);
    return {
      message: `Dealer ${dealer.name} has been successfully deleted`,
      deleted_dealer: this.formatDealerResponse(dealer)
    };
  }

  @Get(':id/upload-url')
  async getUploadUrl(@Param('id') id: string) {
    try {
      // First verify the dealer exists
      await this.dealersService.findOne(id);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const filename = `dealer-${id}-${timestamp}-${randomString}`;
      
      // Get upload URL from Google Drive service
      const uploadData = await this.googleDriveService.getUploadUrl(filename, 'dealer-logos');
      
      return {
        uploadUrl: uploadData.uploadUrl,
        imageUrl: uploadData.webViewLink
      };
    } catch (error) {
      this.logger.error('Failed to generate upload URL:', error);
      throw error;
    }
  }

  @Get()
  async search(@Query() searchDto: SearchDealerDto) {
    try {
      const result = await this.dealersService.search(searchDto);
      return {
        data: result.data.map(dealer => this.formatDealerResponse(dealer)),
        meta: result.meta
      };
    } catch (error) {
      this.logger.error('Failed to search dealers:', error);
      throw error;
    }
  }
} 
