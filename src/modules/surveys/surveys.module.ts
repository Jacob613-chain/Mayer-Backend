import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysController } from './survey.controller';
import { SurveysService } from './surveys.service';
import { Survey } from './survey.entity';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CompressionModule } from '../compression/compression.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Survey]),
    GoogleDriveModule,
    CompressionModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {} 