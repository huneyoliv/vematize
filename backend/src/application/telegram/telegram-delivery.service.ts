import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';

@Injectable()
export class TelegramDeliveryService {
  private bot: Telegraf | null = null;

  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  setBotInstance(bot: Telegraf) {
    this.bot = bot;
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
        const inviteLink = await this.bot.telegram.createChatInviteLink(product.telegramGroupId, {
          member_limit: 1,
        });
        await this.bot.telegram.sendMessage(
          sale.telegramChatId,
          `🔗 *Acesse seu grupo exclusivo:*\n${inviteLink.invite_link}`,
          { parse_mode: 'Markdown' },
        );
      } catch (error: any) {
        console.error('[Telegram Delivery] Erro ao criar invite link:', error?.message);
      }
    }
  }
}
