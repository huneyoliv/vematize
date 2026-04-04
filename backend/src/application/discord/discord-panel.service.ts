import { Injectable } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';

@Injectable()
export class DiscordPanelService {
  constructor(
    private readonly botService: DiscordBotService,
    private readonly productRepo: ProductRepository,
    private readonly botConfigRepo: BotConfigRepository,
  ) {}

  async sendPanel(channelId: string, panel: any): Promise<boolean> {
    const client = this.botService.getClient();
    if (!client) {
      console.error('[Discord Panel] Client não disponível');
      return false;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`[Discord Panel] Canal ${channelId} não encontrado ou não é texto`);
        return false;
      }

      const products = panel.productIds
        ? await Promise.all(panel.productIds.map((id: string) => this.productRepo.findById(id)))
        : [];

      const validProducts = products.filter(Boolean);

      if (validProducts.length === 0) {
        console.error('[Discord Panel] Nenhum produto válido para o painel');
        return false;
      }

      const options = validProducts.map((p: any) => ({
        label: p.name,
        description: p.description?.substring(0, 100) || `R$ ${Number(p.price).toFixed(2)}`,
        value: p.id,
      }));

      const embed = {
        title: panel.title || '🛍️ Loja',
        description: panel.description || 'Selecione um produto para comprar:',
        color: panel.color || 0x00ff00,
        footer: { text: 'Vematize' },
        timestamp: new Date().toISOString(),
      };

      const components = [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: `PANEL_SELECT:${panel.id || 'default'}`,
              placeholder: 'Escolha um produto...',
              options,
            },
          ],
        },
      ];

      await (channel as any).send({ embeds: [embed], components });
      console.log(`[Discord Panel] Painel enviado no canal ${channelId}`);
      return true;
    } catch (error: any) {
      console.error('[Discord Panel] Erro ao enviar painel:', error?.message);
      return false;
    }
  }

  async sendAllPanels(): Promise<void> {
    const config = await this.botConfigRepo.findByPlatform('discord');
    if (!config?.discordPanels) return;

    for (const panel of config.discordPanels) {
      if (panel.channelId) {
        await this.sendPanel(panel.channelId, panel);
      }
    }
  }
}
