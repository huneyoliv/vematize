import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { TelegramFlowService } from './telegram-flow.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;

  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly flowService: TelegramFlowService,
  ) {}

  async onModuleInit() {
    try {
      const config = await this.botConfigRepo.findByPlatform('telegram');
      if (!config?.botToken) {
        console.log('[Telegram] Nenhum bot configurado');
        return;
      }

      await this.startBot(config.botToken);
    } catch (error: any) {
      console.error('[Telegram] Erro ao iniciar bot:', error?.message);
    }
  }

  async onModuleDestroy() {
    await this.stopBot();
  }

  async startBot(token: string) {
    if (this.bot) {
      await this.stopBot();
    }

    this.bot = new Telegraf(token);
    this.flowService.setBotInstance(this.bot);

    this.bot.on('text', async (ctx) => {
      try {
        await this.flowService.handleTextMessage(ctx);
      } catch (error: any) {
        console.error('[Telegram] Erro no text handler:', error?.message);
      }
    });

    this.bot.on('callback_query', async (ctx) => {
      try {
        await this.flowService.handleCallbackQuery(ctx);
      } catch (error: any) {
        console.error('[Telegram] Erro no callback handler:', error?.message);
      }
    });

    const domain = process.env.DOMAIN || 'localhost';
    const isDev = domain === 'localhost' || process.env.NODE_ENV === 'development';

    if (isDev) {
      this.bot.launch();
      console.log('[Telegram] Bot iniciado em modo polling (dev)');
    } else {
      const webhookUrl = `https://${domain}/api/telegram/webhook`;
      await this.bot.telegram.setWebhook(webhookUrl);
      console.log(`[Telegram] Webhook configurado: ${webhookUrl}`);
    }
  }

  async stopBot() {
    if (this.bot) {
      this.bot.stop();
      this.bot = null;
      console.log('[Telegram] Bot parado');
    }
  }

  getBotInstance(): Telegraf | null {
    return this.bot;
  }

  async handleWebhookUpdate(update: any) {
    if (this.bot) {
      await this.bot.handleUpdate(update);
    }
  }
}
