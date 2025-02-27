import { Controller, Get, Render } from '@nestjs/common';
import { DealersService } from '../dealers/dealers.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly dealersService: DealersService) {}

  @Get()
  @Render('admin')
  async getAdminPage() {
    const dealers = await this.dealersService.findAll();
    return { 
      dealers: dealers.map(dealer => ({
        id: dealer.id,
        dealer_id: dealer.dealer_id,
        name: dealer.name,
        reps: dealer.reps,
        logo: dealer.logo
      }))
    };
  }
}