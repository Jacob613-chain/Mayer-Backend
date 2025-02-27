import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DealersModule } from '../dealers/dealers.module';

@Module({
  imports: [DealersModule],
  controllers: [AdminController],
})
export class AdminModule {}