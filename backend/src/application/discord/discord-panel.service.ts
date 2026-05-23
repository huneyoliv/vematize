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
    console.log(`[Debug] Enviando painel para o canal ${channelId}`);
    const client = this.botService.getClient();
    if (!client) {
      console.error('[Debug] Client do Discord nao disponivel');
      return false;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`[Debug] Canal ${channelId} nao encontrado ou nao suporta texto`);
        return false;
      }

      const products = panel.productIds
        ? await Promise.all(panel.productIds.map((id: string) => this.productRepo.findById(id)))
        : [];

      const validProducts = products.filter(Boolean);
      if (validProducts.length === 0) {
        console.error('[Debug] Nenhum produto valido no painel');
        return false;
      }

      const options = validProducts.map((p: any) => ({
        label: p.name,
        description: p.description?.substring(0, 100) || `R$ ${Number(p.price).toFixed(2)}`,
        value: p.id,
      }));

      const embedConfig = panel.embedConfig || {};
      const embed = {
        title: embedConfig.title || panel.name || '🛍️ Loja',
        description: embedConfig.description || 'Selecione um produto para comprar:',
        color: embedConfig.color ? parseInt(embedConfig.color.replace('#', ''), 16) : 0x5865F2,
        image: embedConfig.imageUrl ? { url: embedConfig.imageUrl } : undefined,
        thumbnail: embedConfig.thumbnailUrl ? { url: embedConfig.thumbnailUrl } : undefined,
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
      console.log(`[Debug] Painel enviado com sucesso para ${channelId}`);
      return true;
    } catch (error: any) {
      console.error('[Debug] Erro ao enviar painel:', error?.message);
      return false;
    }
  }

  async sendAllPanels(): Promise<void> {
    console.log('[Debug] Enviando todos os paineis do Discord');
    const config = await this.botConfigRepo.findByPlatform('discord');
    if (!config?.discordPanels) return;

    for (const panel of config.discordPanels) {
      if (panel.channelId && panel.isActive) {
        await this.sendPanel(panel.channelId, panel);
      }
    }
  }

  async syncPanels(newPanels: any[]): Promise<any[]> {
    console.log('[Debug] Iniciando sincronizacao de paineis do Discord');
    const client = this.botService.getClient();
    if (!client) {
      console.error('[Debug] Client do Discord nao disponivel para sincronizacao');
      return newPanels;
    }

    const currentConfig = await this.botConfigRepo.findByPlatform('discord');
    const oldPanels = currentConfig?.discordPanels || [];

    for (const oldPanel of oldPanels) {
      const stillExists = newPanels.find((p) => p.id === oldPanel.id);
      if (!stillExists && oldPanel.messageId && oldPanel.channelId) {
        try {
          console.log(`[Debug] Excluindo painel removido do Discord: ${oldPanel.id}`);
          const channel = await client.channels.fetch(oldPanel.channelId);
          if (channel && channel.isTextBased()) {
            const msg = await (channel as any).messages.fetch(oldPanel.messageId);
            if (msg) {
              await msg.delete();
              console.log(`[Debug] Mensagem de painel deletada do Discord: ${oldPanel.messageId}`);
            }
          }
        } catch (err: any) {
          console.error(`[Debug] Erro ao deletar mensagem de painel excluido ${oldPanel.id}:`, err?.message);
        }
      }
    }

    const resultPanels: any[] = [];

    for (const panel of newPanels) {
      if (!panel.channelId || !panel.productIds || panel.productIds.length === 0 || !panel.isActive) {
        if (panel.messageId && panel.channelId) {
          try {
            console.log(`[Debug] Inativando ou esvaziando painel, removendo mensagem do Discord: ${panel.id}`);
            const channel = await client.channels.fetch(panel.channelId);
            if (channel && channel.isTextBased()) {
              const msg = await (channel as any).messages.fetch(panel.messageId);
              if (msg) {
                await msg.delete();
              }
            }
          } catch (err: any) {
            console.error(`[Debug] Erro ao deletar mensagem de painel inativado ${panel.id}:`, err?.message);
          }
          panel.messageId = undefined;
        }
        resultPanels.push(panel);
        continue;
      }

      try {
        console.log(`[Debug] Processando painel ${panel.name || panel.id}`);
        const channel = await client.channels.fetch(panel.channelId);
        if (!channel || !channel.isTextBased()) {
          console.error(`[Debug] Canal ${panel.channelId} nao encontrado para o painel ${panel.id}`);
          resultPanels.push(panel);
          continue;
        }

        const products = await Promise.all(
          panel.productIds.map((id: string) => this.productRepo.findById(id))
        );
        const validProducts = products.filter(Boolean);

        if (validProducts.length === 0) {
          console.error(`[Debug] Nenhum produto valido para o painel ${panel.id}`);
          resultPanels.push(panel);
          continue;
        }

        const options = validProducts.map((p: any) => ({
          label: p.name,
          description: p.description?.substring(0, 100) || `R$ ${Number(p.price).toFixed(2)}`,
          value: p.id,
        }));

        const embedConfig = panel.embedConfig || {};
        const embed = {
          title: embedConfig.title || panel.name || '🛍️ Loja',
          description: embedConfig.description || 'Selecione um produto para comprar:',
          color: embedConfig.color ? parseInt(embedConfig.color.replace('#', ''), 16) : 0x5865F2,
          image: embedConfig.imageUrl ? { url: embedConfig.imageUrl } : undefined,
          thumbnail: embedConfig.thumbnailUrl ? { url: embedConfig.thumbnailUrl } : undefined,
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

        let messageId = panel.messageId;
        if (messageId) {
          try {
            const msg = await (channel as any).messages.fetch(messageId);
            if (msg) {
              await msg.edit({ embeds: [embed], components });
              console.log(`[Debug] Mensagem de painel editada com sucesso no Discord: ${messageId}`);
            } else {
              const newMsg = await (channel as any).send({ embeds: [embed], components });
              messageId = newMsg.id;
              console.log(`[Debug] Mensagem de painel recriada no Discord: ${messageId}`);
            }
          } catch {
            const newMsg = await (channel as any).send({ embeds: [embed], components });
            messageId = newMsg.id;
            console.log(`[Debug] Mensagem de painel recriada no Discord apos falha de busca: ${messageId}`);
          }
        } else {
          const newMsg = await (channel as any).send({ embeds: [embed], components });
          messageId = newMsg.id;
          console.log(`[Debug] Nova mensagem de painel criada no Discord: ${messageId}`);
        }

        resultPanels.push({
          ...panel,
          messageId,
        });
      } catch (error: any) {
        console.error(`[Debug] Erro ao sincronizar painel ${panel.id} no Discord:`, error?.message);
        resultPanels.push(panel);
      }
    }

    return resultPanels;
  }
}
