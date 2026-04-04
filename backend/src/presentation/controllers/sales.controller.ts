import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';

@Controller('api/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly saleRepo: SaleRepository) {}

  @Get()
  async findAll() {
    return this.saleRepo.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.saleRepo.findById(id);
  }
}
