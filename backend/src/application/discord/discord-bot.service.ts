import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private client: Client | null = null;

  constructor(private readonly botConfigRepo: BotConfigRepository) {}

  async onModuleInit() {
    try {
      const config = await this.botConfigRepo.findByPlatform('discord');
      if (!config?.botToken) {
        console.log('[Discord] Nenhum bot configurado');
        return;
      }

      await this.startBot(config.botToken);
    } catch (error: any) {
      console.error('[Discord] Erro ao iniciar bot:', error?.message);
    }
  }

  async onModuleDestroy() {
    await this.stopBot();
  }

  async startBot(token: string) {
    if (this.client) {
      await this.stopBot();
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.client.on('ready', () => {
      console.log(`[Discord] Bot conectado como ${this.client?.user?.tag}`);
    });

    this.client.on('error', (error) => {
      console.error('[Discord] Erro no client:', error.message);
    });

    await this.client.login(token);
  }

  async stopBot() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      console.log('[Discord] Bot desconectado');
    }
  }

  getClient(): Client | null {
    return this.client;
  }
}
