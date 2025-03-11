import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { Dealer } from './dealer.entity';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dealer]),
    S3Module,
  ],
  controllers: [DealersController],
  providers: [DealersService],
  exports: [DealersService]
})
export class DealersModule {} 
