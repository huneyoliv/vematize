import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { CreateProductDto, UpdateProductDto } from '../../application/dtos/product.dto';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productRepo: ProductRepository) {}

  private normalizeId(value?: string | null): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private applySubscriptionRules(
    dto: CreateProductDto | UpdateProductDto,
    existing?: any,
  ) {
    const merged = { ...(existing || {}), ...dto };
    if (merged.type !== 'subscription') return;

    const telegramGroupId = this.normalizeId(merged.telegramGroupId);
    const discordRoleId = this.normalizeId(merged.discordSubscriptionRoleId);

    const wantsTelegram = !!telegramGroupId;
    const wantsDiscord = !!discordRoleId;

    if (!wantsTelegram && !wantsDiscord) {
      throw new BadRequestException('Selecione Telegram, Discord ou ambos para assinaturas.');
    }
    if (wantsTelegram && !telegramGroupId) {
      throw new BadRequestException('ID do Grupo/Canal Telegram é obrigatório para assinaturas no Telegram.');
    }
    if (wantsDiscord && !discordRoleId) {
      throw new BadRequestException('ID do Cargo Discord é obrigatório para assinaturas no Discord.');
    }

    if (dto.telegramGroupId !== undefined) {
      dto.telegramGroupId = telegramGroupId;
    }
    if (dto.discordSubscriptionRoleId !== undefined) {
      dto.discordSubscriptionRoleId = discordRoleId;
    }
    dto.isTelegramGroupAccess = wantsTelegram;
  }

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
    if (dto.type === 'subscription') {
      this.applySubscriptionRules(dto);
    }
    return this.productRepo.create(dto as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const existing = await this.productRepo.findById(id);
    this.applySubscriptionRules(dto, existing);
    return this.productRepo.update(id, dto as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.productRepo.delete(id);
    return { success: deleted };
  }
}
