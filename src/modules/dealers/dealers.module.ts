import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { Dealer } from './dealer.entity';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CompressionModule } from '../compression/compression.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer]),
    GoogleDriveModule,
    CompressionModule
  ],
  controllers: [DealersController],
  providers: [DealersService],
  exports: [DealersService]
})
export class DealersModule {} 
