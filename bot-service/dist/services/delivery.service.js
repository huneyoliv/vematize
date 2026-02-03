"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverProductDiscord = deliverProductDiscord;
exports.deliverProductTelegram = deliverProductTelegram;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const discord_js_1 = require("discord.js");
async function deliverProductDiscord(sale) {
    logger_1.default.info(`[DeliveryService] Starting Discord delivery for sale ${sale._id}`);
    try {
        const db = (await database_1.default).db('vematize');
        const product = await db.collection('products').findOne({ _id: new mongodb_1.ObjectId(sale.productId) });
        const tenant = await db.collection('tenants').findOne({ _id: new mongodb_1.ObjectId(sale.tenantId) });
        const user = await db.collection('users').findOne({ _id: new mongodb_1.ObjectId(sale.userId) });
        if (!product || !tenant || !user) {
            logger_1.default.error(`[DeliveryService] Missing data for delivery. Product: ${!!product}, Tenant: ${!!tenant}, User: ${!!user}`);
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
        const { getDiscordClient } = await Promise.resolve().then(() => __importStar(require('../services/discord/client.manager')));
        const client = await getDiscordClient(tenant._id.toString());
        if (!client) {
            logger_1.default.error(`[DeliveryService] Discord client not found for tenant ${tenant._id}`);
            return;
        }
        const threadId = sale.discordThreadId;
        if (!threadId) {
            logger_1.default.warn(`[DeliveryService] No Discord thread ID for sale ${sale._id}`);
            return;
        }
        const channel = await client.channels.fetch(threadId);
        if (!channel || !channel.isThread()) {
            logger_1.default.error(`[DeliveryService] Thread ${threadId} not found or not a thread`);
            return;
        }
        const discordSettings = tenant.discordSettings;
        const deliveryType = discordSettings?.deliveryType || 'automatic';
        logger_1.default.info(`[DeliveryService] Delivery type: ${deliveryType}`);
        if (deliveryType === 'automatic') {
            let deliveryContent = '';
            if (product.productSubtype === 'activation_codes' && product.activationCodes && product.activationCodes.length > 0) {
                const code = product.activationCodes[0];
                await db.collection('products').updateOne({ _id: product._id }, {
                    $pull: { activationCodes: code },
                    $push: { activationCodesUsed: code }
                });
                deliveryContent = `🎉 **Código de Ativação:**\n\`\`\`\n${code}\n\`\`\``;
            }
            else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
                deliveryContent = `🎉 **Link para Download:**\n${product.hostedFileUrl}`;
            }
            else {
                deliveryContent = `🎉 **Produto adquirido com sucesso!**\n\nVocê adquiriu: ${product.name}`;
            }
            const deliveryMessage = discordSettings?.deliveryMessage || 'Obrigado pela sua compra!';
            const deliveryEmbed = new discord_js_1.EmbedBuilder()
                .setTitle('✅ Compra Aprovada!')
                .setDescription(`${deliveryMessage}\n\n${deliveryContent}`)
                .addFields({ name: 'ID da Transação', value: `\`${sale.paymentDetails?.paymentId || 'N/A'}\``, inline: true })
                .setColor(0x00FF00)
                .setTimestamp();
            await channel.send({ embeds: [deliveryEmbed] });
            // Update User Purchase History
            await db.collection('users').updateOne({ _id: user._id }, {
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
            });
        }
        else if (deliveryType === 'manual_role' && discordSettings?.deliveryRoleId) {
            // ... Manual role logic ...
            // (Simplified for brevity, can copy full logic if needed)
            const embed = new discord_js_1.EmbedBuilder()
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
                    const logEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle('💰 Nova Venda Realizada')
                        .addFields({ name: 'Produto', value: product.name, inline: true }, { name: 'Valor', value: `R$ ${product.price.toFixed(2)}`, inline: true }, { name: 'Cliente', value: user.name || 'Desconhecido', inline: true })
                        .setColor(0x00FF00)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            catch (e) {
                logger_1.default.error('[DeliveryService] Failed to log sale:', e);
            }
        }
    }
    catch (error) {
        logger_1.default.error('[DeliveryService] Error delivering Discord product:', error);
    }
}
async function deliverProductTelegram(sale) {
    logger_1.default.info(`[DeliveryService] Starting Telegram delivery for sale ${sale._id}`);
    // TODO: Implement Telegram delivery similar to Discord
    // We need a TelegramClientManager similar to Discord
}
