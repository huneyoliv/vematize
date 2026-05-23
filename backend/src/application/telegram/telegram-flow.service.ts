import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { CheckoutService } from '../services/checkout.service';
import type { BotFlow, BotStep, BotButton } from '../../domain/entities/bot-config.entity';

@Injectable()
export class TelegramFlowService {
  private bot: Telegraf | null = null;

  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,
    private readonly checkoutService: CheckoutService,
    private readonly couponRepo: CouponRepository,
  ) {}

  setBotInstance(bot: Telegraf) {
    this.bot = bot;
  }

  private escapeMarkdown(text: string): string {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#\+\-=|{}.!])/g, '\\$1');
  }

  private replacePlaceholders(text: string, from: any): string {
    if (!text) return '';
    return text.replace(/{userName}/g, from?.first_name || 'usuário');
  }

  private buildKeyboard(buttons: BotButton[] | undefined) {
    if (!buttons || buttons.length === 0) return undefined;
    const keyboard = buttons.map(button => {
      const action = button.action;
      const callbackData = action.payload ? `${action.type}:${action.payload}` : action.type;
      return [{ text: button.text, callback_data: callbackData }];
    });
    return { inline_keyboard: keyboard };
  }

  private async executeStep(ctx: any, step: BotStep) {
    const messageText = this.replacePlaceholders(step.message, ctx.from);
    const keyboard = this.buildKeyboard(step.buttons);

    const mediaMatch = messageText.match(/\[Mídia\]\((.*?)\)/);

    if (mediaMatch) {
      const mediaUrl = mediaMatch[1];
      const caption = messageText.replace(mediaMatch[0], '').trim();
      const escapedCaption = this.escapeMarkdown(caption);

      try {
        if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          await ctx.replyWithPhoto(mediaUrl, {
            caption: escapedCaption,
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard,
          });
          return;
        }

        await ctx.replyWithVideo(mediaUrl, {
          caption: escapedCaption,
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
          supports_streaming: true,
        });
      } catch {
        const escaped = this.escapeMarkdown(messageText);
        await ctx.reply(escaped, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
      }
      return;
    }

    const escaped = this.escapeMarkdown(messageText);

    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(escaped, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
      } else {
        await ctx.reply(escaped, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
      }
    } catch (e: any) {
      if (!e.response?.description?.includes('message is not modified')) {
        await ctx.reply(escaped, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
      }
    }
  }

  async handleTextMessage(ctx: any) {
    const messageText = ctx.message?.text;
    if (!messageText) return;

    const config = await this.botConfigRepo.findByPlatform('telegram');
    if (!config?.flows || config.flows.length === 0) {
      return ctx.reply('Este bot ainda não foi configurado.');
    }

    const telegramId = ctx.from.id;
    let user = await this.userRepo.findByTelegramId(telegramId);

    if (!user) {
      user = await this.userRepo.create({
        telegramId,
        name: ctx.from.first_name,
        username: ctx.from.username,
        state: 'active',
      });
    }

    if (user.interactionState === 'WAITING_COUPON' && user.interactionData?.productId) {
      await this.handleCouponInput(ctx, user, messageText);
      return;
    }

    if (!messageText.startsWith('/')) return;

    const flow = config.flows.find((f: BotFlow) => f.trigger === messageText);

    if (flow) {
      const startStep = flow.steps.find((s: BotStep) => s.id === flow.startStepId);
      if (startStep) {
        await this.executeStep(ctx, startStep);
      } else {
        await ctx.reply('Fluxo configurado incorretamente.');
      }
    } else if (messageText === '/perfil') {
      await this.showProfile(ctx, user, config.flows);
    } else {
      await ctx.reply('Comando não reconhecido.');
    }
  }

  async handleCallbackQuery(ctx: any) {
    const data = (ctx.callbackQuery as any)?.data;
    if (!data) return;

    const config = await this.botConfigRepo.findByPlatform('telegram');
    if (!config?.flows) return;

    const allSteps = config.flows.flatMap((f: BotFlow) => f.steps);
    const actionType = data.split(':')[0];
    const payload = data.substring(actionType.length + 1);

    const telegramId = ctx.from.id;
    let user = await this.userRepo.findByTelegramId(telegramId);
    if (!user) return ctx.answerCbQuery('Envie /start primeiro.');

    switch (actionType) {
      case 'GO_TO_STEP': {
        const step = allSteps.find((s: BotStep) => s.id === payload);
        if (step) await this.executeStep(ctx, step);
        else await ctx.answerCbQuery('Passo não encontrado.');
        break;
      }

      case 'MAIN_MENU': {
        const mainFlow = config.flows.find((f: BotFlow) => f.trigger === '/start');
        if (mainFlow) {
          const startStep = allSteps.find((s: BotStep) => s.id === mainFlow.startStepId);
          if (startStep) await this.executeStep(ctx, startStep);
        }
        break;
      }

      case 'SHOW_PROFILE': {
        await this.showProfile(ctx, user, config.flows);
        break;
      }

      case 'LINK_TO_PRODUCT': {
        await this.showProduct(ctx, payload, user, config);
        break;
      }

      case 'BUY_WITH_METHOD': {
        const [_method, _gateway, productId] = payload.split(':');
        await this.handleBuy(ctx, productId, user);
        break;
      }

      case 'CART_APPLY_COUPON': {
        await ctx.deleteMessage().catch(() => {});
        const sentMessage = await ctx.reply('🎟️ *Digite o código do cupom:*', {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancelar', callback_data: `CANCEL_COUPON_INPUT:${payload}` }]],
          },
        });
        await this.userRepo.update(user.id, {
          interactionState: 'WAITING_COUPON',
          interactionData: {
            productId: payload,
            couponPromptMessageId: sentMessage.message_id,
          },
        });
        await ctx.answerCbQuery('Aguardando cupom...');
        break;
      }

      case 'CANCEL_COUPON_INPUT': {
        await ctx.deleteMessage().catch(() => {});
        await this.userRepo.update(user.id, {
          interactionState: undefined,
          interactionData: {},
        });
        await ctx.answerCbQuery('Cancelado.');
        await this.showProduct(ctx, payload, user, config, true);
        break;
      }

      case 'REMOVE_COUPON': {
        await this.userRepo.update(user.id, {
          interactionState: undefined,
          interactionData: {},
        });
        user.interactionData = {};
        await ctx.answerCbQuery('Cupom removido.');
        await this.showProduct(ctx, payload, user, config);
        break;
      }

      case 'ACQUIRE_PRODUCT': {
        await this.handleFreeProduct(ctx, payload, user);
        break;
      }

      default:
        await ctx.answerCbQuery('Ação recebida.');
    }
  }

  private async showProduct(ctx: any, productId: string, user: any, config: any, isNewMessage = false) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      if (ctx.callbackQuery && !isNewMessage) {
        await ctx.editMessageText('❌ Produto não disponível.').catch(() => {});
      } else {
        await ctx.reply('❌ Produto não disponível.').catch(() => {});
      }
      return;
    }

    const isOfferActive = product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date();
    const price = isOfferActive ? Number(product.discountPrice) : Number(product.price);

    let finalPrice = price;
    let couponInfo = '';
    const appliedCoupon = user.interactionData?.appliedCoupon;

    if (appliedCoupon) {
      const coupon = await this.couponRepo.findByCode(appliedCoupon);
      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
        const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;
        const isApplicable = !coupon.applicableProducts?.length || coupon.applicableProducts.includes(product.id);

        if (notExpired && hasUses && isApplicable) {
          const discount = coupon.type === 'percentage' ? (price * coupon.value) / 100 : coupon.value;
          finalPrice = price - discount;
          if (finalPrice < 0) finalPrice = 0;
          couponInfo = `\n🎫 *Cupom:* \`${appliedCoupon}\` aplicado \\(\\-R\\$ ${discount.toFixed(2).replace('.', ',')}\\)\n`;
        }
      }
    }

    let msg = `*${this.escapeMarkdown(product.name)}*\n\n${this.escapeMarkdown(product.description || '')}\n\n`;

    if (Number(product.price) === 0) {
      msg += `*Preço: Grátis\\!*`;
      const kb = { inline_keyboard: [[{ text: '✅ Obter Agora', callback_data: `ACQUIRE_PRODUCT:${product.id}` }]] };
      if (ctx.callbackQuery && !isNewMessage) {
        await ctx.editMessageText(msg, { parse_mode: 'MarkdownV2', reply_markup: kb }).catch(() => {});
      } else {
        await ctx.reply(msg, { parse_mode: 'MarkdownV2', reply_markup: kb }).catch(() => {});
      }
      return;
    }

    const priceStr = `*Preço: R\\$ ${finalPrice.toFixed(2).replace('.', ',')}*`;
    const originalPriceStr = appliedCoupon && finalPrice !== price ? ` \\(de ~R\\$ ${price.toFixed(2).replace('.', ',')}~\\)` : '';
    const originalStr = isOfferActive ? ` \\(de ~R\\$ ${Number(product.price).toFixed(2).replace('.', ',')}~\\)` : '';
    msg += `${priceStr}${originalPriceStr}${originalStr}\n${couponInfo}\nEscolha como deseja pagar:`;

    const keyboardRows: any[][] = [
      [{ text: '💲 Pagar com PIX', callback_data: `BUY_WITH_METHOD:pix:auto:${product.id}` }],
    ];
    if (appliedCoupon) {
      keyboardRows.push([{ text: '🗑️ Remover Cupom', callback_data: `REMOVE_COUPON:${product.id}` }]);
    } else {
      keyboardRows.push([{ text: '🎫 Usar Cupom', callback_data: `CART_APPLY_COUPON:${product.id}` }]);
    }
    keyboardRows.push([{ text: '⬅️ Voltar ao Início', callback_data: 'MAIN_MENU' }]);

    try {
      if (ctx.callbackQuery && !isNewMessage) {
        await ctx.editMessageText(msg, {
          parse_mode: 'MarkdownV2',
          reply_markup: { inline_keyboard: keyboardRows },
        });
      } else {
        await ctx.reply(msg, {
          parse_mode: 'MarkdownV2',
          reply_markup: { inline_keyboard: keyboardRows },
        });
      }
    } catch {
      await ctx.reply(msg, {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: keyboardRows },
      });
    }
  }

  private async handleBuy(ctx: any, productId: string, user: any) {
    if (ctx.callbackQuery) {
      await ctx.editMessageText('⏳ Preparando seu pagamento...').catch(() => {});
    } else {
      await ctx.reply('⏳ Preparando seu pagamento...').catch(() => {});
    }

    try {
      const result = await this.checkoutService.createCheckout({
        productId,
        userId: user.id,
        platform: 'telegram',
        telegramChatId: ctx.chat.id,
        couponCode: user.interactionData?.appliedCoupon,
      });

      let msg = `✅ <b>Pagamento Gerado!</b>\n\n`;
      msg += `Use o código abaixo para pagar via Pix:\n\n`;
      msg += `<code>${result.qrCode}</code>\n\n`;
      msg += `⏰ Expira em 30 minutos.`;

      const kb: any[][] = [];
      if (result.ticketUrl) {
        kb.push([{ text: '🔗 Abrir no Navegador', url: result.ticketUrl }]);
      }
      kb.push([{ text: '⬅️ Voltar ao Início', callback_data: 'MAIN_MENU' }]);

      await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: kb },
      });
    } catch (error: any) {
      await ctx.editMessageText(`❌ ${error?.message || 'Erro ao gerar pagamento.'}`);
    }
  }

  private async handleFreeProduct(ctx: any, productId: string, user: any) {
    const product = await this.productRepo.findById(productId);
    if (!product || Number(product.price) > 0) {
      return ctx.answerCbQuery('Produto não é gratuito.');
    }

    await ctx.answerCbQuery('Processando...');

    if (product.productSubtype === 'activation_codes' && product.activationCodes?.length) {
      const code = product.activationCodes[0];
      await ctx.reply(`🎉 Código de Ativação:\n\`${code}\``);
    } else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
      await ctx.reply(`🎉 Link para download:\n${product.hostedFileUrl}`);
    } else {
      await ctx.reply('✅ Produto adquirido com sucesso!');
    }
  }

  private async handleCouponInput(ctx: any, user: any, messageText: string) {
    await ctx.deleteMessage().catch(() => {});
    const couponCode = messageText.trim().toUpperCase();
    const productId = user.interactionData?.productId;
    const couponPromptMessageId = user.interactionData?.couponPromptMessageId;

    const coupon = await this.couponRepo.findByCode(couponCode);
    let isValid = true;
    let errorMessage = '';

    if (!coupon || !coupon.isActive) {
      isValid = false;
      errorMessage = '❌ *Cupom inválido ou inativo\\!*';
    } else {
      const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
      const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;
      const isApplicable = !coupon.applicableProducts?.length || coupon.applicableProducts.includes(productId);

      if (!notExpired) {
        isValid = false;
        errorMessage = '❌ *Cupom expirado\\!*';
      } else if (!hasUses) {
        isValid = false;
        errorMessage = '❌ *Limite de usos atingido\\!*';
      } else if (!isApplicable) {
        isValid = false;
        errorMessage = '❌ *Cupom não aplicável a este produto\\!*';
      }
    }

    if (!isValid) {
      if (couponPromptMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          couponPromptMessageId,
          undefined,
          `${errorMessage}\n\n🎟️ *Digite o código do cupom:*`,
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [[{ text: '❌ Cancelar', callback_data: `CANCEL_COUPON_INPUT:${productId}` }]],
            },
          }
        ).catch(() => {});
      }
      return;
    }

    if (couponPromptMessageId) {
      await ctx.telegram.deleteMessage(ctx.chat.id, couponPromptMessageId).catch(() => {});
    }

    await this.userRepo.update(user.id, {
      interactionState: undefined,
      interactionData: {
        appliedCoupon: couponCode,
      },
    });

    user.interactionData = { appliedCoupon: couponCode };

    const config = await this.botConfigRepo.findByPlatform('telegram');
    await this.showProduct(ctx, productId, user, config, true);
  }

  private async showProfile(ctx: any, user: any, flows: BotFlow[]) {
    let msg = `*Perfil de ${this.escapeMarkdown(user.name || 'Usuário')}*\n\n`;
    msg += `ID: \`${user.id}\`\n`;
    msg += `Status: ${user.state}`;

    const mainFlow = flows.find((f: BotFlow) => f.trigger === '/start');
    const kb: any[][] = [];
    if (mainFlow?.startStepId) {
      kb.push([{ text: '⬅️ Voltar ao Início', callback_data: `GO_TO_STEP:${mainFlow.startStepId}` }]);
    }

    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, { parse_mode: 'MarkdownV2', reply_markup: { inline_keyboard: kb } });
      } else {
        await ctx.reply(msg, { parse_mode: 'MarkdownV2', reply_markup: { inline_keyboard: kb } });
      }
    } catch {
      await ctx.reply(msg, { parse_mode: 'MarkdownV2', reply_markup: { inline_keyboard: kb } });
    }
  }
}
