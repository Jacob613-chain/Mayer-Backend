import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UploadedFiles, Redirect, NotFoundException } from '@nestjs/common';
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

  @Get()
  async search(@Query() searchDto: SearchSurveyDto) {
    const result = await this.surveysService.search(searchDto);
    
    // Transform the data to match the frontend expectations
    return {
      results: result.data.map(survey => ({
        id: survey.id,
        customer_name: survey.customer_name,
        customer_address: survey.customer_address,
        rep_name: survey.rep_name,
        dealer_id: survey.dealer_id,
        created_at: survey.created_at,
        // Add any other fields needed by the frontend
      })),
      total: result.meta.total
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.surveysService.search({ id: +id });
    if (result.data.length === 0) {
      throw new NotFoundException(`Survey with ID "${id}" not found`);
    }
    const survey = result.data[0];
    return {
      ...survey,
      viewUrl: `/r/${survey.dealer_id}`
    };
  }
} 
