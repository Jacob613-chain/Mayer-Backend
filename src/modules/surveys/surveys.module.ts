import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './survey.controller';
import { SurveysService } from './surveys.service';
import { Survey } from './survey.entity';
import { S3Module } from '../s3/s3.module';
import { CompressionModule } from '../compression/compression.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Survey]),
    S3Module,
    CompressionModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {} 
