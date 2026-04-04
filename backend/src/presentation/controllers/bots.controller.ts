import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { UpdateBotConfigDto } from '../../application/dtos/bot-config.dto';

@Controller('api/bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly botConfigRepo: BotConfigRepository) {}

  @Get()
  async findAll() {
    return this.botConfigRepo.findAll();
  }

  @Get(':platform')
  async findByPlatform(@Param('platform') platform: string) {
    return this.botConfigRepo.findByPlatform(platform);
  }

  @Put(':platform')
  async updateByPlatform(
    @Param('platform') platform: string,
    @Body() dto: any,
  ) {
    const { regenerateInteractionsToken, ...data } = dto;

    if (platform === 'discord' && data.botToken && !data.interactionsToken) {
      const existing = await this.botConfigRepo.findByPlatform('discord');
      if (!existing?.interactionsToken) {
        data.interactionsToken = randomBytes(32).toString('hex');
      }
    }

    if (platform === 'discord' && regenerateInteractionsToken) {
      data.interactionsToken = randomBytes(32).toString('hex');
    }

    return this.botConfigRepo.upsertByPlatform(platform, data);
  }
}
