import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from '../../application/dtos/coupon.dto';

@Controller('api/coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(
    private readonly couponRepo: CouponRepository,
    private readonly saleRepo: SaleRepository,
  ) {}

  @Get()
  async findAll() {
    return this.couponRepo.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.couponRepo.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateCouponDto) {
    return this.couponRepo.create(dto as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponRepo.update(id, dto as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.couponRepo.delete(id);
    return { success: deleted };
  }

  @Post('validate')
  async validate(@Body() dto: ValidateCouponDto) {
    const coupon = await this.couponRepo.findByCode(dto.code);
    if (!coupon) {
      return { valid: false, message: 'Cupom não encontrado.' };
    }
    if (!coupon.isActive) {
      return { valid: false, message: 'Cupom inativo.' };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, message: 'Cupom expirado.' };
    }
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, message: 'Cupom esgotado.' };
    }
    if (dto.productId && coupon.applicableProducts?.length) {
      if (!coupon.applicableProducts.includes(dto.productId)) {
        return { valid: false, message: 'Cupom não aplicável a este produto.' };
      }
    }
    if (coupon.limitToOneUsePerUser && dto.userId) {
      const previousUse = await this.saleRepo.findByCouponAndUser(dto.code, dto.userId);
      if (previousUse) {
        return { valid: false, message: 'Você já utilizou este cupom anteriormente.' };
      }
    }
    return { valid: true, coupon };
  }
}

