import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dealer } from '../dealers/dealer.entity';
import { DealersService } from '../dealers/dealers.service';

@Injectable()
export class SurveyFormService {
  private readonly logger = new Logger(SurveyFormService.name);

  constructor(
    private readonly dealersService: DealersService
  ) {}

  async getDealerInfo(dealerId: string) {
    try {
      this.logger.debug(`Searching for dealer with dealer_id: ${dealerId}`);
      const dealer = await this.dealersService.findByDealerId(dealerId);
      this.logger.debug('Found dealer:', dealer);
      return dealer;
    } catch (error) {
      this.logger.error('Error finding dealer:', error);
      throw error;
    }
  }
}
