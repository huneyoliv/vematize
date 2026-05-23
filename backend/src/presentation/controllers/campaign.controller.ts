import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { Telegraf } from 'telegraf';

interface SendCampaignDto {
  message: string;
  imageUrl?: string;
  userIds?: string[];
}

interface CampaignResult {
  total: number;
  sent: number;
  failed: number;
  errors: { userId: string; reason: string }[];
}

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly botConfigRepo: BotConfigRepository,
  ) {}

  @Post('send')
  async send(@Body() dto: SendCampaignDto): Promise<CampaignResult> {
    if (!dto.message?.trim()) {
      throw new BadRequestException('Mensagem é obrigatória.');
    }

    const config = await this.botConfigRepo.findByPlatform('telegram');
    if (!config?.botToken) {
      throw new BadRequestException('Bot do Telegram não configurado.');
    }

    const bot = new Telegraf(config.botToken);

    let targets: { id: string; telegramId: number }[];

    if (dto.userIds && dto.userIds.length > 0) {
      const users = await Promise.all(dto.userIds.map(id => this.userRepo.findById(id)));
      targets = users
        .filter((u): u is NonNullable<typeof u> => !!u && !!u.telegramId)
        .map(u => ({ id: u.id, telegramId: u.telegramId }));
    } else {
      const allUsers = await this.userRepo.findAll();
      targets = allUsers
        .filter(u => !!u.telegramId)
        .map(u => ({ id: u.id, telegramId: u.telegramId }));
    }

    if (targets.length === 0) {
      throw new BadRequestException('Nenhum usuário com Telegram encontrado.');
    }

    const result: CampaignResult = { total: targets.length, sent: 0, failed: 0, errors: [] };

    for (const target of targets) {
      try {
        if (dto.imageUrl) {
          await bot.telegram.sendPhoto(target.telegramId, dto.imageUrl, {
            caption: dto.message,
            parse_mode: 'HTML',
          });
        } else {
          await bot.telegram.sendMessage(target.telegramId, dto.message, {
            parse_mode: 'HTML',
          });
        }
        result.sent++;
        await new Promise(r => setTimeout(r, 50));
      } catch (err: any) {
        result.failed++;
        result.errors.push({ userId: target.id, reason: err?.message || 'Erro desconhecido' });
      }
    }

    return result;
  }
}
