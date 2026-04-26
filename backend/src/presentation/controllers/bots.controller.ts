import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { TelegramBotService } from '../../application/telegram/telegram-bot.service';
import { DiscordBotService } from '../../application/discord/discord-bot.service';


@Controller('api/bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly telegramBotService: TelegramBotService,
    private readonly discordBotService: DiscordBotService,
  ) {}
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

    const result = await this.botConfigRepo.upsertByPlatform(platform, data);
    
    try {
      if (platform === 'telegram' && data.botToken) {
        await this.telegramBotService.startBot(data.botToken);
      } else if (platform === 'discord' && data.botToken) {
        await this.discordBotService.startBot(data.botToken);
      }
    } catch (error: any) {
      console.error(`Erro ao recarregar bot ${platform}:`, error?.message);
    }
    
    return result;
  }
}
