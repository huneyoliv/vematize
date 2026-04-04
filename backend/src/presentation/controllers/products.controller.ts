import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { CreateProductDto, UpdateProductDto } from '../../application/dtos/product.dto';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productRepo: ProductRepository) {}

  @Get()
  async findAll() {
    return this.productRepo.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productRepo.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productRepo.create(dto as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productRepo.update(id, dto as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.productRepo.delete(id);
    return { success: deleted };
  }
}
