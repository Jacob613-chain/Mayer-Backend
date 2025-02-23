import { Controller, Get, Post, Body, Param, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
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
    return this.surveysService.search(searchDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.surveysService.findOne(+id);
  }
} 