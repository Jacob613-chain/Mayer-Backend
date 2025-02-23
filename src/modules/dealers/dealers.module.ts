import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dealer } from './dealer.entity';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { GoogleDriveModule } from '../google-drive/google-drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer]),
    GoogleDriveModule,
  ],
  controllers: [DealersController],
  providers: [DealersService],
})
export class DealersModule {} 
