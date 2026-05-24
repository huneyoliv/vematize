import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../../infrastructure/database/repositories/subscription.repository';
import { SubscriptionEntity } from '../../infrastructure/database/entities/subscription.orm-entity';
import { DiscordBotService } from '../discord/discord-bot.service';
import { Telegraf } from 'telegraf';

interface ActivateParams {
  userId: string;
  productId: string;
  saleId: string;
  platform: 'telegram' | 'discord';
  durationDays: number;
  telegramChatId?: number;
  telegramGroupId?: string;
  discordUserId?: string;
  discordGuildId?: string;
  discordRoleId?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private telegramBot: Telegraf | null = null;

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly discordBotService: DiscordBotService,
  ) {}

  setTelegramBot(bot: Telegraf) {
    this.telegramBot = bot;
  }

  async activate(params: ActivateParams): Promise<SubscriptionEntity> {
    const existing = await this.subscriptionRepo.findActiveByUserAndProduct(params.userId, params.productId);

    if (existing && existing.status === 'active') {
      this.logger.log(`Renovando assinatura ${existing.id} por mais ${params.durationDays} dias.`);
      const newExpiresAt = new Date(existing.expiresAt);
      newExpiresAt.setDate(newExpiresAt.getDate() + params.durationDays);

      return (await this.subscriptionRepo.update(existing.id, {
        expiresAt: newExpiresAt,
        notifiedAt: null as any,
        status: 'active',
        // Update snapshot data if provided
        discordRoleId: params.discordRoleId || existing.discordRoleId,
        discordGuildId: params.discordGuildId || existing.discordGuildId,
        telegramGroupId: params.telegramGroupId || existing.telegramGroupId,
      })) as SubscriptionEntity;
    }

    this.logger.log(`Criando nova assinatura para user ${params.userId} produto ${params.productId}`);
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startsAt.getDate() + params.durationDays);

    return this.subscriptionRepo.create({
      userId: params.userId,
      productId: params.productId,
      saleId: params.saleId,
      platform: params.platform,
      status: 'active',
      startsAt,
      expiresAt,
      telegramChatId: params.telegramChatId,
      telegramGroupId: params.telegramGroupId,
      discordUserId: params.discordUserId,
      discordGuildId: params.discordGuildId,
      discordRoleId: params.discordRoleId,
    });
  }

  async expire(subscriptionId: string): Promise<void> {
    const sub = await this.subscriptionRepo.findById(subscriptionId);
    if (!sub || sub.status !== 'active') return;

    this.logger.log(`Expirando assinatura ${subscriptionId}`);

    if (sub.platform === 'discord' && sub.discordUserId && sub.discordGuildId && sub.discordRoleId) {
      const client = this.discordBotService.getClient();
      if (client) {
        try {
          const guild = await client.guilds.fetch(sub.discordGuildId);
          const member = await guild.members.fetch(sub.discordUserId);
          if (member) {
            await member.roles.remove(sub.discordRoleId);
            this.logger.log(`Cargo removido do usuário ${sub.discordUserId} no guild ${sub.discordGuildId}`);
            
            try {
              await member.send('❌ Sua assinatura expirou e o cargo foi removido.');
            } catch (err) {
              this.logger.warn(`Não foi possível enviar DM de expiração para o usuário ${sub.discordUserId}`);
            }
          }
        } catch (error: any) {
          this.logger.error(`Erro ao remover cargo Discord da assinatura ${subscriptionId}: ${error?.message}`);
        }
      }
    } else if (sub.platform === 'telegram' && sub.telegramGroupId && sub.telegramChatId) {
      if (this.telegramBot) {
        try {
          await this.telegramBot.telegram.banChatMember(sub.telegramGroupId, sub.telegramChatId);
          await this.telegramBot.telegram.unbanChatMember(sub.telegramGroupId, sub.telegramChatId);
          this.logger.log(`Usuário ${sub.telegramChatId} kickado do grupo ${sub.telegramGroupId}`);
          
          try {
            await this.telegramBot.telegram.sendMessage(sub.telegramChatId, '❌ Sua assinatura expirou e você foi removido do grupo exclusivo.');
          } catch (err) {
             this.logger.warn(`Não foi possível enviar msg de expiração para ${sub.telegramChatId}`);
          }
        } catch (error: any) {
           this.logger.error(`Erro ao kickar usuário Telegram da assinatura ${subscriptionId}: ${error?.message}`);
        }
      } else {
        this.logger.warn('Telegram Bot não está inicializado para realizar o kick.');
      }
    }

    await this.subscriptionRepo.update(subscriptionId, { status: 'expired' });
  }

  async sendExpirationWarning(subscriptionId: string): Promise<void> {
    const sub = await this.subscriptionRepo.findById(subscriptionId);
    if (!sub || sub.status !== 'active') return;

    this.logger.log(`Enviando alerta de expiração para assinatura ${subscriptionId}`);

    if (sub.platform === 'discord' && sub.discordUserId) {
      const client = this.discordBotService.getClient();
      if (client) {
        try {
          const user = await client.users.fetch(sub.discordUserId);
          await user.send('⚠️ **Aviso:** Sua assinatura expira em 3 dias! Renove para não perder o acesso.');
        } catch (error: any) {
          this.logger.warn(`Erro ao enviar DM de aviso Discord: ${error?.message}`);
        }
      }
    } else if (sub.platform === 'telegram' && sub.telegramChatId) {
       if (this.telegramBot) {
         try {
           await this.telegramBot.telegram.sendMessage(sub.telegramChatId, '⚠️ *Aviso:* Sua assinatura expira em 3 dias! Renove para não perder o acesso ao grupo.', { parse_mode: 'Markdown' });
         } catch (error: any) {
           this.logger.warn(`Erro ao enviar aviso Telegram: ${error?.message}`);
         }
       }
    }

    await this.subscriptionRepo.update(subscriptionId, { notifiedAt: new Date() });
  }
}
