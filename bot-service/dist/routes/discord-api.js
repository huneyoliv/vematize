"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discord_js_1 = require("discord.js");
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("../config/database"));
const mongodb_1 = require("mongodb");
const router = (0, express_1.Router)();
// Helper to get Discord Client
async function getDiscordClient(botToken) {
    const client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.GuildMembers,
        ],
    });
    await client.login(botToken);
    await new Promise((resolve) => {
        if (client.isReady()) {
            resolve(true);
        }
        else {
            client.once('clientReady', resolve);
        }
    });
    return client;
}
// Get Guilds
router.post('/guilds', async (req, res) => {
    let client = null;
    try {
        const { botToken } = req.body;
        if (!botToken) {
            return res.status(400).json({ success: false, message: 'Token não fornecido' });
        }
        client = await getDiscordClient(botToken);
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
        }));
        res.json({ success: true, guilds });
    }
    catch (error) {
        logger_1.default.error('[Discord API] Error fetching guilds:', error);
        if (error.code === 'TokenInvalid') {
            return res.status(400).json({ success: false, message: 'Token inválido.' });
        }
        res.status(500).json({ success: false, message: 'Erro ao buscar servidores.' });
    }
    finally {
        if (client)
            await client.destroy();
    }
});
// Get Guild Data (Channels, Roles, Categories)
router.post('/guild/:guildId/data', async (req, res) => {
    let client = null;
    try {
        const { botToken } = req.body;
        const { guildId } = req.params;
        if (!botToken || !guildId) {
            return res.status(400).json({ success: false, message: 'Dados incompletos' });
        }
        client = await getDiscordClient(botToken);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
        }
        const textChannels = guild.channels.cache
            .filter(channel => channel.type === discord_js_1.ChannelType.GuildText)
            .map(channel => ({
            id: channel.id,
            name: channel.name,
            parentId: channel.parentId,
        }));
        const categories = guild.channels.cache
            .filter(channel => channel.type === discord_js_1.ChannelType.GuildCategory)
            .map(category => ({
            id: category.id,
            name: category.name,
        }));
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            position: role.position,
        }))
            .sort((a, b) => b.position - a.position);
        res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
            },
            channels: textChannels,
            categories,
            roles,
        });
    }
    catch (error) {
        logger_1.default.error('[Discord API] Error fetching guild data:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados do servidor.' });
    }
    finally {
        if (client)
            await client.destroy();
    }
});
// Publish Panels
router.post('/panels/publish', async (req, res) => {
    let client = null;
    try {
        const { tenantId, panelId } = req.body;
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID required' });
        }
        const db = (await database_1.default).db('vematize');
        const tenant = await db.collection('tenants').findOne({ _id: new mongodb_1.ObjectId(tenantId) });
        if (!tenant)
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        if (!tenant.connections?.discord?.botToken) {
            return res.status(400).json({ success: false, message: 'Bot do Discord não configurado.' });
        }
        if (!tenant.discordSettings?.panels || tenant.discordSettings.panels.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum painel configurado.' });
        }
        const panelsToPublish = panelId
            ? tenant.discordSettings.panels.filter((p) => p.id === panelId && p.isActive)
            : tenant.discordSettings.panels.filter((p) => p.isActive);
        if (panelsToPublish.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum painel ativo para publicar.' });
        }
        client = await getDiscordClient(tenant.connections.discord.botToken);
        const publishResults = [];
        for (const panel of panelsToPublish) {
            try {
                const products = await db.collection('products').find({
                    tenantId: tenant._id.toString(),
                    _id: { $in: panel.productIds.map((id) => new mongodb_1.ObjectId(id)) }
                }).toArray();
                if (products.length === 0) {
                    publishResults.push({ panelId: panel.id, success: false, message: 'Nenhum produto encontrado.' });
                    continue;
                }
                const channel = await client.channels.fetch(panel.channelId);
                if (!channel || !channel.isTextBased()) {
                    publishResults.push({ panelId: panel.id, success: false, message: 'Canal inválido.' });
                    continue;
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle(panel.embedConfig.title)
                    .setColor(parseInt(panel.embedConfig.color.replace('#', ''), 16))
                    .setTimestamp();
                if (panel.embedConfig.description)
                    embed.setDescription(panel.embedConfig.description);
                if (panel.embedConfig.imageUrl)
                    embed.setImage(panel.embedConfig.imageUrl);
                if (panel.embedConfig.thumbnailUrl)
                    embed.setThumbnail(panel.embedConfig.thumbnailUrl);
                if (products.length > 0) {
                    const productList = products.map(p => `✅ ${p.name}`).join('\n');
                    embed.addFields({ name: '📦 Produtos Disponíveis', value: productList, inline: false });
                }
                const selectMenu = new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId(`PANEL_SELECT:${panel.id}`)
                    .setPlaceholder('📋 Clique aqui para ver as opções')
                    .setMinValues(1)
                    .setMaxValues(1);
                products.forEach((product) => {
                    const priceText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
                    let stockText = '';
                    if (product.productSubtype === 'activation_codes') {
                        const availableStock = product.activationCodes?.length || 0;
                        stockText = availableStock > 0 ? `📦 | Estoque: ${availableStock}` : '❌ | Estoque: 0';
                    }
                    else if (product.stock !== null && product.stock !== undefined) {
                        stockText = product.stock > 0 ? `📦 | Estoque: ${product.stock}` : '❌ | Estoque: 0';
                    }
                    else {
                        stockText = '♾️ | Estoque ilimitado';
                    }
                    const option = new discord_js_1.StringSelectMenuOptionBuilder()
                        .setLabel(product.name.substring(0, 100))
                        .setValue(product._id.toString())
                        .setDescription(`💰 | Valor: ${priceText} - ${stockText}`)
                        .setEmoji('🛒');
                    selectMenu.addOptions(option);
                });
                const rows = [new discord_js_1.ActionRowBuilder().addComponents(selectMenu)];
                if (panel.messageId) {
                    try {
                        const message = await channel.messages.fetch(panel.messageId);
                        await message.edit({ embeds: [embed], components: rows });
                        publishResults.push({ panelId: panel.id, success: true, message: 'Painel atualizado.' });
                    }
                    catch (e) {
                        const message = await channel.send({ embeds: [embed], components: rows });
                        await db.collection('tenants').updateOne({ _id: tenant._id, 'discordSettings.panels.id': panel.id }, { $set: { 'discordSettings.panels.$.messageId': message.id } });
                        publishResults.push({ panelId: panel.id, success: true, message: 'Novo painel criado.' });
                    }
                }
                else {
                    const message = await channel.send({ embeds: [embed], components: rows });
                    await db.collection('tenants').updateOne({ _id: tenant._id, 'discordSettings.panels.id': panel.id }, { $set: { 'discordSettings.panels.$.messageId': message.id } });
                    publishResults.push({ panelId: panel.id, success: true, message: 'Painel publicado.' });
                }
            }
            catch (error) {
                logger_1.default.error(`[Discord API] Error publishing panel ${panel.id}:`, error);
                publishResults.push({ panelId: panel.id, success: false, message: error.message });
            }
        }
        const successCount = publishResults.filter(r => r.success).length;
        res.json({
            success: true,
            message: `${successCount} de ${publishResults.length} painel(is) publicado(s).`,
            results: publishResults
        });
    }
    catch (error) {
        logger_1.default.error('[Discord API] Error publishing panels:', error);
        res.status(500).json({ success: false, message: 'Erro ao publicar painéis.' });
    }
    finally {
        if (client)
            await client.destroy();
    }
});
exports.default = router;
