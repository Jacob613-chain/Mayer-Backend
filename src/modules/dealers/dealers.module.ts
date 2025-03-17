import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { Dealer } from './dealer.entity';
import { Survey } from '../surveys/survey.entity';
import { S3Module } from '../s3/s3.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CompressionModule } from '../compression/compression.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer, Survey]),
    S3Module,
    GoogleDriveModule,
    CompressionModule,
  ],
  controllers: [DealersController],
  providers: [DealersService],
  exports: [DealersService]
})
export class DealersModule {} 
