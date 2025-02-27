import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyFormController } from './survey-form.controller';
import { SurveyFormService } from './survey-form.service';
import { Dealer } from '../dealers/dealer.entity';
import { DealersService } from '../dealers/dealers.service';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { S3Module } from '../s3/s3.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer]),
    GoogleDriveModule,
    S3Module,
    SurveysModule,
  ],
  controllers: [SurveyFormController],
  providers: [SurveyFormService, DealersService],
})
export class SurveyFormModule {}
