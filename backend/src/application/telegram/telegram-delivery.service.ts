import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SubscriptionService } from '../services/subscription.service';

@Injectable()
export class TelegramDeliveryService {
  private bot: Telegraf | null = null;

  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly productRepo: ProductRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  setBotInstance(bot: Telegraf) {
    this.bot = bot;
    this.subscriptionService.setTelegramBot(bot);
  }

  async deliver(sale: any, product: any): Promise<void> {
    if (!this.bot || !sale.telegramChatId) {
      console.error('[Telegram Delivery] Bot ou chatId indisponível');
      return;
    }

    const config = await this.botConfigRepo.findByPlatform('telegram');
    const deliveryMessage = config?.deliveryMessage || 'Obrigado pela sua compra!';

    let content = '';

    if (product.productSubtype === 'activation_codes' && product.activationCodes?.length) {
      const code = product.activationCodes[0];

      await this.productRepo.update(product.id, {
        activationCodes: product.activationCodes.slice(1),
        activationCodesUsed: [...(product.activationCodesUsed || []), code],
      });

      content = `🎉 *Código de Ativação:*\n\`\`\`\n${code}\n\`\`\``;
    } else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
      content = `🎉 *Link para Download:*\n${product.hostedFileUrl}`;
    } else if (product.productSubtype === 'media_pack' && product.mediaUrls?.length) {
      content = `📦 *Pack de Mídias:*`;
      for (const url of product.mediaUrls) {
        try {
          await this.bot.telegram.sendMessage(sale.telegramChatId, url);
        } catch {
          console.error(`[Telegram Delivery] Erro ao enviar mídia: ${url}`);
        }
      }
    } else {
      content = `🎉 *Produto adquirido com sucesso!*`;
    }

    const msg = `✅ *Pagamento Aprovado!*\n\n${deliveryMessage}\n\n${content}`;

    try {
      await this.bot.telegram.sendMessage(sale.telegramChatId, msg, {
        parse_mode: 'Markdown',
      });
    } catch (error: any) {
      console.error('[Telegram Delivery] Erro ao enviar:', error?.message);
    }

    if (product.isTelegramGroupAccess && product.telegramGroupId) {
      try {
        let inviteLinkOptions: any = {};
        
        if (product.type === 'subscription') {
          // Link com expiração de 30 minutos (1800 segundos) e limite de 1 membro
          const expireDate = Math.floor(Date.now() / 1000) + 1800;
          inviteLinkOptions = {
            member_limit: 1,
            expire_date: expireDate,
          };
        } else {
          // Produto normal (vitalício no grupo): sem expiração, mas também limite de 1 membro para segurança
          inviteLinkOptions = {
            member_limit: 1,
          };
        }

        const inviteLink = await this.bot.telegram.createChatInviteLink(product.telegramGroupId, inviteLinkOptions);
        
        await this.bot.telegram.sendMessage(
          sale.telegramChatId,
          `🔗 *Acesse seu grupo exclusivo:*\n${inviteLink.invite_link}`,
          { parse_mode: 'Markdown' },
        );
      } catch (error: any) {
        console.error('[Telegram Delivery] Erro ao criar invite link:', error?.message);
      }
    }

    // Ativar assinatura se for o caso
    if (product.type === 'subscription' && product.durationDays) {
      await this.subscriptionService.activate({
        userId: sale.userId,
        productId: product.id,
        saleId: sale.id,
        platform: 'telegram',
        durationDays: product.durationDays,
        telegramChatId: sale.telegramChatId,
        telegramGroupId: product.telegramGroupId,
      });
    }
  }
}
