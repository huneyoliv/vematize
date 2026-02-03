"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscordClient = getDiscordClient;
const discord_js_1 = require("discord.js");
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = __importDefault(require("../../utils/logger"));
const clients = new Map();
async function getDiscordClient(tenantId) {
    if (clients.has(tenantId)) {
        return clients.get(tenantId);
    }
    // Initialize new client
    try {
        const db = (await database_1.default).db('vematize');
        const tenant = await db.collection('tenants').findOne({ _id: new mongodb_1.ObjectId(tenantId) });
        if (!tenant || !tenant.connections?.discord?.botToken) {
            logger_1.default.warn(`[DiscordManager] Tenant ${tenantId} or bot token not found.`);
            return null;
        }
        const client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
            ]
        });
        await client.login(tenant.connections.discord.botToken);
        client.once('ready', () => {
            logger_1.default.info(`[DiscordManager] Bot ready for tenant ${tenantId} as ${client.user?.tag}`);
        });
        clients.set(tenantId, client);
        return client;
    }
    catch (error) {
        logger_1.default.error(`[DiscordManager] Failed to initialize client for tenant ${tenantId}:`, error);
        return null;
    }
}
const mongodb_1 = require("mongodb");
