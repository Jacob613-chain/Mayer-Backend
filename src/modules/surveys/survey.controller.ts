
import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UploadedFiles, NotFoundException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SearchSurveyDto } from './dto/search-survey.dto';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('photos'))
  async create(@Body() createSurveyDto: CreateSurveyDto, @UploadedFiles() files: Express.Multer.File[]) {
    return this.surveysService.create(createSurveyDto, files);
  }

  @Get('search')
  async search(@Query() searchDto: SearchSurveyDto) {
    const result = await this.surveysService.search(searchDto);
    
    return {
      results: result.data.map(survey => ({
        id: survey.id,
        dealer_id: survey.dealer_id,
        dealer_name: survey.dealer.name,
        dealer_reps: survey.dealer.reps,
        customer_name: survey.customer_name,
        customer_address: survey.customer_address,
        rep_name: survey.rep_name,
        created_at: survey.created_at,
        response_url: `/r/${survey.dealer_id}?survey_id=${survey.id}`,
      })),
      meta: {
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
        totalPages: result.meta.totalPages
      }
    };
  }

  @Get('responses/:dealer_id')
  async getDealerResponses(@Param('dealer_id') dealerId: string) {
    return this.surveysService.getDealerResponses(dealerId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('dealer_id') dealerId?: string,
    @Query('customer_name') customerName?: string,
    @Query('customer_address') customerAddress?: string
  ) {
    if (dealerId && customerName && customerAddress) {
      // If all query parameters are provided, use them to find the specific survey
      const survey = await this.surveysService.findByDealerAndCustomer(
        dealerId,
        customerName,
        customerAddress
      );
      
      return {
        id: survey.id,
        dealer_id: survey.dealer_id,
        dealer_name: survey.dealer.name,
        customer_name: survey.customer_name,
        customer_address: survey.customer_address
      };
    }

    // Fall back to finding by ID if query parameters aren't provided
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid survey ID format: "${id}"`);
    }

    const survey = await this.surveysService.findOne(numericId);
    
    return {
      id: survey.id,
      dealer_id: survey.dealer_id,
      dealer_name: survey.dealer.name,
      customer_name: survey.customer_name,
      customer_address: survey.customer_address
    };
  }
} 
