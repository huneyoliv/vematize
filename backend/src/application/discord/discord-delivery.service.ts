import { Injectable, Logger } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SubscriptionService } from '../services/subscription.service';
import { EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ThreadChannel } from 'discord.js';

@Injectable()
export class DiscordDeliveryService {
  private readonly logger = new Logger(DiscordDeliveryService.name);

  constructor(
    private readonly botService: DiscordBotService,
    private readonly botConfigRepo: BotConfigRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async deliver(sale: any, product: any): Promise<void> {
    const client = this.botService.getClient();
    if (!client) {
      this.logger.error('[Discord Delivery] Client não disponível');
      return;
    }

    const threadId = sale.discordThreadId;
    if (!threadId) {
      this.logger.error(`[Discord Delivery] Sem threadId para sale ${sale.id}`);
      return;
    }

    try {
      const channel = await client.channels.fetch(threadId) as ThreadChannel;
      if (!channel || !channel.isThread()) {
        this.logger.error(`[Discord Delivery] Thread ${threadId} não encontrada`);
        return;
      }

      const config = await this.botConfigRepo.findByPlatform('discord');
      const deliveryType = config?.discordDeliveryType || 'automatic';

      // Lógica de Assinatura
      if (product.type === 'subscription') {
        const duration = product.durationDays || 30;
        const user = await this.userRepo.findById(sale.userId);
        
        await this.subscriptionService.activate({
          userId: sale.userId,
          productId: product.id,
          saleId: sale.id,
          platform: 'discord',
          durationDays: duration,
          discordUserId: user?.discordId,
          discordGuildId: channel.guild.id,
          discordRoleId: product.discordSubscriptionRoleId,
        });

        // Adiciona as roles no Discord
        if (product.discordSubscriptionRoleId) {
          await this.addRoleToUser(sale, product.discordSubscriptionRoleId);
        }
        if (config?.discordSupportRoleId) {
          await this.addRoleToUser(sale, config.discordSupportRoleId);
        }
        if (config?.discordDeliveryRoleId) {
          await this.addRoleToUser(sale, config.discordDeliveryRoleId);
        }

        const embed = new EmbedBuilder()
          .setTitle('⭐ Assinatura Ativada!')
          .setDescription(`Obrigado pela sua assinatura!\n**Produto:** ${product.name}\n**Duração:** ${duration} dias\n\nAs roles foram atribuídas ao seu usuário no Discord.`)
          .setColor(0xffd700)
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
           new ButtonBuilder().setCustomId(`SUPPORT_CONTACT:${sale.id}`).setLabel('Contatar Suporte').setStyle(ButtonStyle.Secondary).setEmoji('📞')
        );

        await channel.send({ embeds: [embed], components: [row] });
      } else {
        // Lógica de Produto Normal (automatic ou manual)
        if (deliveryType === 'automatic') {
          let deliveryContent = '';

          if (product.productSubtype === 'activation_codes' && product.activationCodes?.length) {
            const code = product.activationCodes[0];
            
            await this.productRepo.update(product.id, {
              activationCodes: product.activationCodes.slice(1),
              activationCodesUsed: [...(product.activationCodesUsed || []), code],
            });

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

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
             new ButtonBuilder().setCustomId(`SUPPORT_CONTACT:${sale.id}`).setLabel('Contatar Suporte').setStyle(ButtonStyle.Secondary).setEmoji('📞')
          );

          await channel.send({ embeds: [embed], components: [row] });
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
      }

      await this.logSale(sale, product);

      // Agendar deleção da thread se configurado
      const archiveMinutes = config?.discordThreadArchiveMinutes || 1440; // Default 24h
      if (archiveMinutes > 0) {
        setTimeout(async () => {
          try {
            const ch = await client.channels.fetch(threadId) as ThreadChannel;
            if (ch && !ch.archived) {
              await ch.delete('Tempo de suporte/entrega expirado');
            }
          } catch (e) {
             // Ignorar erro silenciosamente se a thread já não existir
          }
        }, archiveMinutes * 60 * 1000);
      }

    } catch (error: any) {
      this.logger.error('[Discord Delivery] Erro:', error?.message);
    }
  }

  async removeRoleFromUser(discordId: string, roleId: string) {
    const client = this.botService.getClient();
    if (!client) return;

    try {
      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        try {
          const member = await guild.members.fetch(discordId);
          if (member && member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            this.logger.log(`[Discord Delivery] Role ${roleId} removida do user ${discordId}`);
          }
        } catch {
          continue;
        }
      }
    } catch (error: any) {
      this.logger.error('[Discord Delivery] Erro ao remover role:', error?.message);
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
            this.logger.log(`[Discord Delivery] Role ${roleId} adicionada ao user ${user.discordId}`);
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (error: any) {
      this.logger.error('[Discord Delivery] Erro ao adicionar role:', error?.message);
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
      this.logger.error('[Discord Delivery] Erro no log:', error?.message);
    }
  }
}
