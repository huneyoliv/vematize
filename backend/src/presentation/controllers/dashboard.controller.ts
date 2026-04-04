import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,
    private readonly saleRepo: SaleRepository,
  ) {}

  @Get()
  async getStats() {
    const [totalUsers, activeUsers, totalProducts, totalSales, approvedSales] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo.countByState('active'),
        this.productRepo.count(),
        this.saleRepo.count(),
        this.saleRepo.countByStatus('approved'),
      ]);

    return {
      totalUsers,
      activeUsers,
      totalProducts,
      totalSales,
      approvedSales,
    };
  }
}
