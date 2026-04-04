import { Controller, Post, Req, Res, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { CheckoutService } from '../../application/services/checkout.service';

@Controller('api/discord')
export class DiscordInteractionsController {
  constructor(
    private readonly botConfigRepo: BotConfigRepository,
    private readonly productRepo: ProductRepository,
    private readonly userRepo: UserRepository,
    private readonly checkoutService: CheckoutService,
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
      return this.handleComponent(body, res);
    }

    if (body?.type === 5) {
      return this.handleModalSubmit(body, res);
    }

    return res.status(400).json({ error: 'Tipo não suportado' });
  }

  private async handleComponent(body: any, res: Response) {
    const customId = body.data?.custom_id;
    const userId = body.member?.user?.id || body.user?.id;
    const username = body.member?.user?.username || body.user?.username;

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
        return res.json({
          type: 4,
          data: { content: `❌ Estoque insuficiente para **${product.name}**.`, flags: 64 },
        });
      }

      const price = Number(product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()
        ? product.discountPrice
        : product.price);

      return res.json({
        type: 4,
        data: {
          content: `🛒 **Resumo do Pedido**`,
          embeds: [
            {
              title: product.name,
              description: product.description || 'Sem descrição',
              color: 0x00ff00,
              fields: [
                { name: 'Preço', value: `R$ ${price.toFixed(2)}`, inline: true },
                { name: 'Quantidade', value: '1', inline: true },
              ],
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: 'Pagar com PIX',
                  custom_id: `CHECKOUT:${productId}:${userId}`,
                },
                {
                  type: 2,
                  style: 4,
                  label: 'Cancelar',
                  custom_id: `CART_CANCEL:${productId}`,
                  emoji: { name: '🗑️' },
                },
              ],
            },
          ],
          flags: 64,
        },
      });
    }

    if (customId?.startsWith('CHECKOUT:')) {
      res.json({ type: 5, data: { flags: 64 } });

      const [, productId, discordUserId] = customId.split(':');

      (async () => {
        try {
          let user = await this.userRepo.findByDiscordId(discordUserId);
          if (!user) {
            user = await this.userRepo.create({
              discordId: discordUserId,
              name: username || 'Discord User',
              state: 'active',
            });
          }

          const parentChannelId = body.channel_id;
          const config = await this.botConfigRepo.findByPlatform('discord');

          let threadId: string | undefined;
          try {
            const botToken = config?.botToken;
            if (botToken && parentChannelId) {
              const sanitizedUsername = (username || 'user').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
              const threadRes = await fetch(
                `https://discord.com/api/v10/channels/${parentChannelId}/threads`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bot ${botToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: `cart-${sanitizedUsername}`,
                    type: 12,
                    invitable: false,
                  }),
                },
              );
              const threadData = await threadRes.json();
              threadId = threadData.id;

              if (threadId) {
                await fetch(
                  `https://discord.com/api/v10/channels/${threadId}/thread-members/${discordUserId}`,
                  {
                    method: 'PUT',
                    headers: { Authorization: `Bot ${botToken}` },
                  },
                );
              }
            }
          } catch (e: any) {
            console.error('[Discord] Erro ao criar thread:', e?.message);
          }

          const result = await this.checkoutService.createCheckout({
            productId,
            userId: user.id,
            platform: 'discord',
            discordChannelId: parentChannelId,
            discordThreadId: threadId,
          });

          const product = await this.productRepo.findById(productId);

          const payload: any = {
            embeds: [
              {
                title: '✅ Pagamento Gerado!',
                description: `Valor: **R$ ${Number(product?.price || 0).toFixed(2)}**\n\nExpira em 30 minutos.`,
                color: 0x00ff00,
                fields: [
                  {
                    name: 'Código Pix',
                    value: `\`\`\`${result.qrCode}\`\`\``,
                  },
                ],
                footer: { text: 'Vematize Payments' },
              },
            ],
            flags: 64,
          };

          if (result.ticketUrl) {
            payload.components = [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 5,
                    label: 'Abrir no Navegador',
                    url: result.ticketUrl,
                  },
                ],
              },
            ];
          }

          const appId = body.application_id;
          const interactionToken = body.token;

          await fetch(
            `https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          );
        } catch (err: any) {
          console.error('[Discord Checkout] Erro:', err?.message);

          const appId = body.application_id;
          const interactionToken = body.token;
          await fetch(
            `https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `❌ ${err?.message || 'Erro ao gerar pagamento.'}`,
                flags: 64,
              }),
            },
          );
        }
      })();

      return;
    }

    if (customId?.startsWith('CART_CANCEL:')) {
      return res.json({
        type: 7,
        data: {
          content: '❌ **Compra Cancelada**',
          components: [],
          embeds: [],
        },
      });
    }

    return res.json({ type: 4, data: { content: `✅ Interação recebida!`, flags: 64 } });
  }

  private async handleModalSubmit(body: any, res: Response) {
    return res.json({ type: 4, data: { content: '✅ Recebido!', flags: 64 } });
  }
}
