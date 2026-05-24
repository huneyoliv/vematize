import { Controller, Post, Req, Res, Param, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { CheckoutService } from '../../application/services/checkout.service';
import { DiscordBotService } from '../../application/discord/discord-bot.service';
import { TextChannel, ThreadChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

@Controller('api/discord')
export class DiscordInteractionsController {
  private readonly logger = new Logger(DiscordInteractionsController.name);

  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly productRepo: ProductRepository,
    private readonly userRepo: UserRepository,
    private readonly couponRepo: CouponRepository,
    private readonly checkoutService: CheckoutService,
    private readonly discordBotService: DiscordBotService,
  ) {}

  @Post('interactions/:token')
  async interactions(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const body = req.body;
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    const rawBody = (req as any).rawBody;

    const config = await this.botConfigRepo.findByPlatform('discord');
    if (!config?.publicKey) {
      return res.status(401).json({ error: 'Bot não configurado' });
    }

    if (body?.type === 1 && (!signature || !timestamp)) {
      return res.json({ type: 1 });
    }

    if ((body?.type === 3 || body?.type === 5) && (!signature || !timestamp || !rawBody)) {
       return res.status(401).json({ error: 'Assinatura obrigatória' });
    }

    if (signature && timestamp && rawBody) {
      try {
        const { verifyKey } = await import('discord-interactions');
        const isValid = await verifyKey(rawBody, signature, timestamp, config.publicKey);
        if (!isValid) {
          return res.status(401).json({ error: 'Assinatura inválida' });
        }
      } catch {
        return res.status(401).json({ error: 'Erro na verificação' });
      }
    }

    if (body?.type === 1) {
      return res.json({ type: 1 });
    }

    if (body?.type === 3) {
      return this.handleComponent(body, res, config);
    }

    if (body?.type === 5) {
      return this.handleModalSubmit(body, res, config);
    }

    return res.status(400).json({ error: 'Tipo não suportado' });
  }

  private async handleComponent(body: any, res: Response, config: any) {
    const customId = body.data?.custom_id;
    const userId = body.member?.user?.id || body.user?.id;
    const username = body.member?.user?.username || body.user?.username;
    const guildId = body.guild_id;

    if (customId?.startsWith('PANEL_SELECT:')) {
      const productId = body.data?.values?.[0];
      if (!productId) {
        return res.json({ type: 4, data: { content: '❌ Nenhuma opção selecionada.', flags: 64 } });
      }

      const product = await this.productRepo.findById(productId);
      if (!product) {
        return res.json({ type: 4, data: { content: '❌ Produto não disponível.', flags: 64 } });
      }

      if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
        return res.json({ type: 4, data: { content: `❌ Estoque insuficiente para **${product.name}**.`, flags: 64 } });
      }

      const client = this.discordBotService.getClient();
      if (!client) {
         return res.json({ type: 4, data: { content: '❌ Bot do Discord offline.', flags: 64 } });
      }

      const parentChannelId = body.channel_id;

      try {
        const channel = await client.channels.fetch(parentChannelId) as TextChannel;
        
        if (!channel || !channel.isTextBased()) throw new Error('Canal inválido');

        const shortId = Math.random().toString(36).substring(2, 6);
        const thread = await channel.threads.create({
           name: `🛒-${username}-${shortId}`,
           autoArchiveDuration: 60,
           type: 12, // Private thread se possivel, se não vai ser tratado
           invitable: false,
           reason: 'Carrinho de compras',
        });

        await thread.members.add(userId);

        const price = Number(product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date() ? product.discountPrice : product.price);

        const embed = new EmbedBuilder()
          .setTitle(`🛒 Carrinho: ${product.name}`)
          .setDescription(product.description || 'Sem descrição')
          .setColor(0x00ff00)
          .addFields([
            { name: 'Preço', value: `R$ ${price.toFixed(2)}`, inline: true },
            { name: 'Quantidade', value: '1', inline: true },
          ]);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
           new ButtonBuilder().setCustomId(`CHECKOUT:${productId}:${userId}:`).setLabel('Pagar com PIX').setStyle(ButtonStyle.Success).setEmoji('💰'),
           new ButtonBuilder().setCustomId(`CART_COUPON:${productId}:${userId}`).setLabel('Usar Cupom').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
           new ButtonBuilder().setCustomId(`CART_CANCEL:${productId}:${userId}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('❌'),
        );

        await thread.send({ content: `<@${userId}>`, embeds: [embed], components: [row] });

        return res.json({ type: 4, data: { content: `✅ Seu carrinho foi criado! Acesse: <#${thread.id}>`, flags: 64 } });
      } catch (err: any) {
        this.logger.error(`Erro ao criar thread carrinho: ${err.message}`);
        return res.json({ type: 4, data: { content: '❌ Erro ao criar canal de carrinho. O servidor pode não permitir threads privadas.', flags: 64 } });
      }
    }

    if (customId?.startsWith('CART_COUPON:')) {
      const [, productId, ownerId] = customId.split(':');
      if (userId !== ownerId) {
        return res.json({ type: 4, data: { content: '❌ Este não é o seu carrinho.', flags: 64 } });
      }
      return res.json({
         type: 9,
         data: {
           title: 'Adicionar Cupom',
           custom_id: `MODAL_COUPON:${productId}`,
           components: [
             {
               type: 1,
               components: [
                 {
                   type: 4,
                   custom_id: 'coupon_code',
                   label: 'Código do Cupom',
                   style: 1,
                   min_length: 1,
                   max_length: 20,
                   placeholder: 'VEMATIZE10',
                   required: true,
                 }
               ]
             }
           ]
         }
      });
    }

    if (customId?.startsWith('CART_CANCEL:')) {
      const [, productId, ownerId] = customId.split(':');
      if (userId !== ownerId && ownerId) {
         return res.json({ type: 4, data: { content: '❌ Este não é o seu carrinho.', flags: 64 } });
      }
      
      const threadId = body.channel_id;
      const client = this.discordBotService.getClient();
      if (client) {
         const thread = await client.channels.fetch(threadId) as ThreadChannel;
         if (thread && thread.isThread()) {
            await thread.send('🗑️ Carrinho cancelado. Esta thread será arquivada/excluída.');
            setTimeout(() => {
              thread.delete().catch(() => {
                thread.setArchived(true).catch(() => {});
              });
            }, 2000);
         }
      }
      return res.json({ type: 7, data: { components: [] } }); 
    }

    if (customId?.startsWith('CHECKOUT:')) {
      const parts = customId.split(':');
      const productId = parts[1];
      const discordUserId = parts[2];
      const appliedCoupon = parts[3] || undefined;
      if (userId !== discordUserId) {
        return res.json({ type: 4, data: { content: '❌ Este não é o seu carrinho.', flags: 64 } });
      }

      res.json({ type: 5, data: { flags: 0 } });

      (async () => {
        try {
          let user = await this.userRepo.findByDiscordId(discordUserId);
          if (!user) {
            user = await this.userRepo.create({ discordId: discordUserId, name: username || 'Discord User', state: 'active' });
          }

          const threadId = body.channel_id;
          
          const result = await this.checkoutService.createCheckout({
            productId,
            userId: user.id,
            platform: 'discord',
            discordChannelId: null as any,
            discordThreadId: threadId,
            couponCode: appliedCoupon,
            onExpired: async () => {
              const client = this.discordBotService.getClient();
              if (client) {
                const thread = await client.channels.fetch(threadId) as ThreadChannel;
                if (thread) await thread.send('⏰ **Pagamento expirado!** Seu tempo de 30 minutos terminou. Crie um novo carrinho.');
              }
            },
          });

          const product = await this.productRepo.findById(productId);
          const appId = body.application_id;
          const interactionToken = body.token;

          const displayPrice = result.totalPrice;
          const couponNote = appliedCoupon ? `\n🎫 Cupom **${appliedCoupon}** aplicado!` : '';

          const payload: any = {
            content: `<@${userId}>`,
            embeds: [
              {
                title: '✅ Pagamento Gerado!',
                description: `Valor: **R$ ${displayPrice.toFixed(2)}**${couponNote}\n\nExpira em 30 minutos.`,
                color: 0x00ff00,
                fields: [{ name: 'Código Pix', value: `\`\`\`${result.qrCode}\`\`\`` }],
                footer: { text: 'Vematize Payments' },
              },
            ],
            components: [],
          };

          const row = new ActionRowBuilder<ButtonBuilder>();
          if (result.ticketUrl) {
            row.addComponents(new ButtonBuilder().setLabel('Abrir no Navegador').setStyle(ButtonStyle.Link).setURL(result.ticketUrl));
          }
          row.addComponents(new ButtonBuilder().setCustomId(`CART_CANCEL:${productId}:${userId}`).setLabel('Cancelar Compra').setStyle(ButtonStyle.Danger).setEmoji('❌'));
          
          payload.components = [row.toJSON()];

          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

        } catch (err: any) {
          this.logger.error('[Discord Checkout] Erro:', err?.message);
          const appId = body.application_id;
          const interactionToken = body.token;
          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `❌ ${err?.message || 'Erro ao gerar pagamento.'}` }),
          });
        }
      })();
      return;
    }

    if (customId?.startsWith('SUPPORT_CONTACT:')) {
      const threadId = body.channel_id;
      const client = this.discordBotService.getClient();
      if (!client) return res.json({ type: 4, data: { content: '❌ Bot offline', flags: 64 } });
      
      try {
        const thread = await client.channels.fetch(threadId) as ThreadChannel;
        
        const content = config?.discordSupportRoleId 
          ? `📞 <@&${config.discordSupportRoleId}>, o usuário solicitou suporte!`
          : `📞 O usuário solicitou suporte!`;
        
        await thread.send(content);
        
        return res.json({
           type: 7,
           data: {
              components: [
                {
                   type: 1,
                   components: [
                      {
                         type: 2,
                         style: 4,
                         label: 'Encerrar Atendimento',
                         custom_id: 'SUPPORT_CLOSE',
                         emoji: { name: '🔒' }
                      }
                   ]
                }
              ]
           }
        });
      } catch(err: any) {
         return res.json({ type: 4, data: { content: '❌ Erro ao acionar suporte', flags: 64 } });
      }
    }

    if (customId === 'SUPPORT_CLOSE') {
      const client = this.discordBotService.getClient();
      if (!client) return res.json({ type: 4, data: { content: '❌ Bot offline', flags: 64 } });

      try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        
        const hasSupportRole = config.discordSupportRoleId && member.roles.cache.has(config.discordSupportRoleId);
        const hasDeliveryRole = config.discordDeliveryRoleId && member.roles.cache.has(config.discordDeliveryRoleId);
        const isAdmin = member.permissions.has('Administrator');

        if (!hasSupportRole && !hasDeliveryRole && !isAdmin) {
           return res.json({ type: 4, data: { content: '❌ Você não tem permissão para encerrar o atendimento.', flags: 64 } });
        }

        const thread = await client.channels.fetch(body.channel_id) as ThreadChannel;
        await thread.send('🔒 Atendimento encerrado por um administrador. A thread será fechada.');
        
        setTimeout(() => {
          thread.setArchived(true).catch(() => {});
        }, 3000);

        return res.json({ type: 4, data: { content: '✅ Atendimento encerrado.', flags: 64 } });
      } catch (err) {
        return res.json({ type: 4, data: { content: '❌ Erro ao encerrar atendimento', flags: 64 } });
      }
    }

    return res.json({ type: 4, data: { content: `✅ Interação recebida!`, flags: 64 } });
  }

  private async handleModalSubmit(body: any, res: Response, config: any) {
    const customId = body.data?.custom_id;
    const userId = body.member?.user?.id || body.user?.id;

    if (customId?.startsWith('MODAL_COUPON:')) {
      const parts = customId.split(':');
      const productId = parts[1];
      const couponCode = (body.data.components[0].components[0].value as string).trim().toUpperCase();

      const coupon = await this.couponRepo.findByCode(couponCode);

      if (!coupon || !coupon.isActive) {
        return res.json({ type: 4, data: { content: '❌ Cupom inválido ou inativo.', flags: 64 } });
      }

      const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
      const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;

      if (!notExpired) {
        return res.json({ type: 4, data: { content: '❌ Este cupom já expirou.', flags: 64 } });
      }
      if (!hasUses) {
        return res.json({ type: 4, data: { content: '❌ Este cupom atingiu o limite de usos.', flags: 64 } });
      }

      const product = await this.productRepo.findById(productId);
      const basePrice = Number(product?.price || 0);
      const discountedPrice = coupon.type === 'percentage'
        ? basePrice - (basePrice * coupon.value) / 100
        : basePrice - coupon.value;
      const finalPrice = Math.max(0, discountedPrice);

      const discountLabel = coupon.type === 'percentage'
        ? `${coupon.value}% de desconto`
        : `R$ ${coupon.value.toFixed(2)} de desconto`;

      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`CHECKOUT:${productId}:${userId}:${couponCode}`)
          .setLabel(`Pagar R$ ${finalPrice.toFixed(2)} com PIX`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('💰'),
        new ButtonBuilder()
          .setCustomId(`CART_COUPON:${productId}:${userId}`)
          .setLabel('Trocar Cupom')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎫'),
        new ButtonBuilder()
          .setCustomId(`CART_CANCEL:${productId}:${userId}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
      );

      return res.json({
        type: 7,
        data: {
          content: `✅ Cupom **${couponCode}** aplicado! **${discountLabel}** → Novo valor: **R$ ${finalPrice.toFixed(2)}**`,
          components: [newRow.toJSON()],
        },
      });
    }

    return res.json({ type: 4, data: { content: '✅ Recebido!', flags: 64 } });
  }
}
