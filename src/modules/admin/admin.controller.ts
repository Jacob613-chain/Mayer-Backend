import { Controller, Get, Render } from '@nestjs/common';
import { DealersService } from '../dealers/dealers.service';
import { SearchDealerDto } from '../dealers/dto/search-dealer.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly dealersService: DealersService) {}

  @Get()
  @Render('admin')
  async getAdminPage() {
    const searchParams: SearchDealerDto = {
      limit: 1000, // Get all dealers
      page: 1
    };
    const { data: dealers } = await this.dealersService.search(searchParams);
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