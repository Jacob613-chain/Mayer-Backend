import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';

@Controller('dealers')  // Changed the base route to 'dealers'
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Get()
  async findAll() {
    const dealers = await this.dealersService.findAll();
    return dealers.map(dealer => ({
      system_id: dealer.id,
      dealer_id: dealer.dealer_id,
      name: dealer.name,
      logo: dealer.logo,
      reps: dealer.reps
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const dealer = await this.dealersService.findOne(id);
    return {
      system_id: dealer.id,
      dealer_id: dealer.dealer_id,
      name: dealer.name,
      logo: dealer.logo,
      reps: dealer.reps
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() createDealerDto: CreateDealerDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const dealer = await this.dealersService.create(createDealerDto, logo);
    return {
      system_id: dealer.id,
      dealer_id: dealer.dealer_id,
      name: dealer.name,
      logo: dealer.logo,
      reps: dealer.reps
    };
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() updateDealerDto: UpdateDealerDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const dealer = await this.dealersService.update(id, updateDealerDto, logo);
    return {
      system_id: dealer.id,
      dealer_id: dealer.dealer_id,
      name: dealer.name,
      logo: dealer.logo,
      reps: dealer.reps
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const dealer = await this.dealersService.findOne(id);
    await this.dealersService.delete(id);
    return {
      message: `Dealer ${dealer.name} has been successfully deleted`
    };
  }
} 
