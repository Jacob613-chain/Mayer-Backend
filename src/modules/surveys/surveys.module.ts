import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './survey.controller';
import { SurveysService } from './surveys.service';
import { Survey } from './survey.entity';
import { CompressionModule } from '../compression/compression.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Survey]),
    CompressionModule,
    GoogleDriveModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {} 
