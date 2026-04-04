import { Injectable } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { EmbedBuilder, TextChannel } from 'discord.js';

@Injectable()
export class DiscordDeliveryService {
  constructor(
    private readonly botService: DiscordBotService,
    private readonly botConfigRepo: BotConfigRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async deliver(sale: any, product: any): Promise<void> {
    const client = this.botService.getClient();
    if (!client) {
      console.error('[Discord Delivery] Client não disponível');
      return;
    }

    const threadId = sale.discordThreadId;
    if (!threadId) {
      console.error(`[Discord Delivery] Sem threadId para sale ${sale.id}`);
      return;
    }

    try {
      const channel = await client.channels.fetch(threadId);
      if (!channel || !channel.isThread()) {
        console.error(`[Discord Delivery] Thread ${threadId} não encontrada`);
        return;
      }

      const config = await this.botConfigRepo.findByPlatform('discord');
      const deliveryType = config?.discordDeliveryType || 'automatic';

      if (deliveryType === 'automatic') {
        let deliveryContent = '';

        if (product.productSubtype === 'activation_codes' && product.activationCodes?.length) {
          const code = product.activationCodes[0];
          deliveryContent = `🎉 **Código de Ativação:**\n\`\`\`\n${code}\n\`\`\``;
        } else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
          deliveryContent = `🎉 **Link para Download:**\n${product.hostedFileUrl}`;
        } else {
          deliveryContent = `🎉 **Produto adquirido com sucesso!**\n\nVocê adquiriu: ${product.name}`;
        }

        const deliveryMessage = config?.deliveryMessage || 'Obrigado pela sua compra!';

        const embed = new EmbedBuilder()
          .setTitle('✅ Compra Aprovada!')
          .setDescription(`${deliveryMessage}\n\n${deliveryContent}`)
          .addFields({
            name: 'ID da Transação',
            value: `\`${sale.paymentDetails?.paymentId || sale.paymentDetails?.txid || 'N/A'}\``,
            inline: true,
          })
          .setColor(0x00ff00)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      } else if (deliveryType === 'manual_role' && config?.discordDeliveryRoleId) {
        const user = await this.userRepo.findById(sale.userId);
        const embed = new EmbedBuilder()
          .setTitle('🔔 Nova Venda - Entrega Manual')
          .setDescription(
            `**Produto:** ${product.name}\n**Cliente:** <@${user?.discordId}>\n\n<@&${config.discordDeliveryRoleId}> Por favor, entregue o produto.`,
          )
          .setColor(0xffaa00);
        await channel.send({ embeds: [embed] });
      }

      if (config?.discordDeliveryRoleId && sale.discordChannelId) {
        await this.addRoleToUser(sale, config.discordDeliveryRoleId);
      }

      await this.logSale(sale, product);
    } catch (error: any) {
      console.error('[Discord Delivery] Erro:', error?.message);
    }
  }

  private async addRoleToUser(sale: any, roleId: string) {
    const client = this.botService.getClient();
    if (!client) return;

    const user = await this.userRepo.findById(sale.userId);
    if (!user?.discordId) return;

    try {
      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        try {
          const member = await guild.members.fetch(user.discordId);
          if (member) {
            await member.roles.add(roleId);
            console.log(`[Discord Delivery] Role ${roleId} adicionada ao user ${user.discordId}`);
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (error: any) {
      console.error('[Discord Delivery] Erro ao adicionar role:', error?.message);
    }
  }

  async logSale(sale: any, product: any): Promise<void> {
    const client = this.botService.getClient();
    if (!client) return;

    const config = await this.botConfigRepo.findByPlatform('discord');
    if (!config?.discordSalesLogChannelId) return;

    try {
      const logChannel = await client.channels.fetch(config.discordSalesLogChannelId);
      if (!logChannel || !logChannel.isTextBased()) return;

      const user = await this.userRepo.findById(sale.userId);

      const embed = new EmbedBuilder()
        .setTitle('💰 Nova Venda Realizada')
        .addFields(
          { name: 'Produto', value: product.name, inline: true },
          { name: 'Valor', value: `R$ ${Number(sale.totalPrice || product.price).toFixed(2)}`, inline: true },
          { name: 'Cliente', value: user?.name || 'Desconhecido', inline: true },
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await (logChannel as TextChannel).send({ embeds: [embed] });
    } catch (error: any) {
      console.error('[Discord Delivery] Erro no log:', error?.message);
    }
  }
}
