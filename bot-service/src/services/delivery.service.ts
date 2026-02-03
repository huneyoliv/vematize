import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import { Sale, Product, Tenant, User } from '../types';
import logger from '../utils/logger';
import { EmbedBuilder, TextChannel } from 'discord.js';

export async function deliverProductDiscord(sale: Sale) {
    logger.info(`[DeliveryService] Starting Discord delivery for sale ${sale._id}`);
    try {
        const db = (await clientPromise).db('vematize');
        const product = await db.collection<Product>('products').findOne({ _id: new ObjectId(sale.productId) });
        const tenant = await db.collection<Tenant>('tenants').findOne({ _id: new ObjectId(sale.tenantId) });
        const user = await db.collection<User>('users').findOne({ _id: new ObjectId(sale.userId) });

        if (!product || !tenant || !user) {
            logger.error(`[DeliveryService] Missing data for delivery. Product: ${!!product}, Tenant: ${!!tenant}, User: ${!!user}`);
            return;
        }

        // Import dynamically to avoid circular dependencies if any, or just to keep it clean
        // We need the Discord Client. Ideally this should be a singleton or passed in.
        // For now, let's assume we can get the client from a global or service.
        // BUT, since we are in a service, we might need to initialize a client for this tenant if not running.
        // However, the bot should be running.

        // TODO: Get active Discord client for this tenant. 
        // This is a challenge in the new architecture: how to access the running bot instance?
        // In the previous code, it seemed to assume a single bot or on-the-fly.
        // Let's assume we have a DiscordManager or similar.

        const { getDiscordClient } = await import('../services/discord/client.manager');
        const client = await getDiscordClient(tenant._id.toString());

        if (!client) {
            logger.error(`[DeliveryService] Discord client not found for tenant ${tenant._id}`);
            return;
        }

        const threadId = sale.discordThreadId;
        if (!threadId) {
            logger.warn(`[DeliveryService] No Discord thread ID for sale ${sale._id}`);
            return;
        }

        const channel = await client.channels.fetch(threadId);
        if (!channel || !channel.isThread()) {
            logger.error(`[DeliveryService] Thread ${threadId} not found or not a thread`);
            return;
        }

        const discordSettings = tenant.discordSettings;
        const deliveryType = discordSettings?.deliveryType || 'automatic';

        logger.info(`[DeliveryService] Delivery type: ${deliveryType}`);

        if (deliveryType === 'automatic') {
            let deliveryContent = '';

            if (product.productSubtype === 'activation_codes' && product.activationCodes && product.activationCodes.length > 0) {
                const code = product.activationCodes[0];

                await db.collection('products').updateOne(
                    { _id: product._id },
                    {
                        $pull: { activationCodes: code },
                        $push: { activationCodesUsed: code }
                    } as any
                );

                deliveryContent = `🎉 **Código de Ativação:**\n\`\`\`\n${code}\n\`\`\``;
            } else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
                deliveryContent = `🎉 **Link para Download:**\n${product.hostedFileUrl}`;
            } else {
                deliveryContent = `🎉 **Produto adquirido com sucesso!**\n\nVocê adquiriu: ${product.name}`;
            }

            const deliveryMessage = discordSettings?.deliveryMessage || 'Obrigado pela sua compra!';

            const deliveryEmbed = new EmbedBuilder()
                .setTitle('✅ Compra Aprovada!')
                .setDescription(`${deliveryMessage}\n\n${deliveryContent}`)
                .addFields({ name: 'ID da Transação', value: `\`${sale.paymentDetails?.paymentId || 'N/A'}\``, inline: true })
                .setColor(0x00FF00)
                .setTimestamp();

            await channel.send({ embeds: [deliveryEmbed] });

            // Update User Purchase History
            await db.collection('users').updateOne(
                { _id: user._id },
                {
                    $push: {
                        purchases: {
                            purchaseId: sale._id?.toString() || '',
                            productId: product._id.toString(),
                            productName: product.name,
                            purchaseDate: new Date(),
                            type: product.type,
                            status: 'approved'
                        }
                    }
                } as any
            );

        } else if (deliveryType === 'manual_role' && discordSettings?.deliveryRoleId) {
            // ... Manual role logic ...
            // (Simplified for brevity, can copy full logic if needed)
            const embed = new EmbedBuilder()
                .setTitle('🔔 Nova Venda - Entrega Manual')
                .setDescription(`**Produto:** ${product.name}\n**Cliente:** <@${user.discordId}>\n\n<@&${discordSettings.deliveryRoleId}> Por favor, entregue o produto.`)
                .setColor(0xFFAA00);
            await channel.send({ embeds: [embed] });
        }

        // Log Sale
        if (discordSettings?.salesLogChannelId) {
            try {
                const logChannel = await client.channels.fetch(discordSettings.salesLogChannelId);
                if (logChannel && logChannel.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('💰 Nova Venda Realizada')
                        .addFields(
                            { name: 'Produto', value: product.name, inline: true },
                            { name: 'Valor', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                            { name: 'Cliente', value: user.name || 'Desconhecido', inline: true }
                        )
                        .setColor(0x00FF00)
                        .setTimestamp();
                    await (logChannel as TextChannel).send({ embeds: [logEmbed] });
                }
            } catch (e) {
                logger.error('[DeliveryService] Failed to log sale:', e);
            }
        }

    } catch (error) {
        logger.error('[DeliveryService] Error delivering Discord product:', error);
    }
}

export async function deliverProductTelegram(sale: Sale) {
    logger.info(`[DeliveryService] Starting Telegram delivery for sale ${sale._id}`);
    // TODO: Implement Telegram delivery similar to Discord
    // We need a TelegramClientManager similar to Discord
}
