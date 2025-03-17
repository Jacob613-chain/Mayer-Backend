import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyFormController } from './survey-form.controller';
import { SurveyFormService } from './survey-form.service';
import { Dealer } from '../dealers/dealer.entity';
import { Survey } from '../surveys/survey.entity';
import { DealersService } from '../dealers/dealers.service';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { SurveysModule } from '../surveys/surveys.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer, Survey]),
    GoogleDriveModule,
    SurveysModule,
    S3Module,
  ],
  controllers: [SurveyFormController],
  providers: [SurveyFormService, DealersService],
})
export class SurveyFormModule {}
