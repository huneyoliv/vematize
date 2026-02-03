import { Client, GatewayIntentBits } from 'discord.js';
import clientPromise from '../../config/database';
import { Tenant } from '../../types';
import logger from '../../utils/logger';

const clients = new Map<string, Client>();

export async function getDiscordClient(tenantId: string): Promise<Client | null> {
    if (clients.has(tenantId)) {
        return clients.get(tenantId)!;
    }

    // Initialize new client
    try {
        const db = (await clientPromise).db('vematize');
        const tenant = await db.collection<Tenant>('tenants').findOne({ _id: new ObjectId(tenantId) });

        if (!tenant || !tenant.connections?.discord?.botToken) {
            logger.warn(`[DiscordManager] Tenant ${tenantId} or bot token not found.`);
            return null;
        }

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        await client.login(tenant.connections.discord.botToken);

        client.once('ready', () => {
            logger.info(`[DiscordManager] Bot ready for tenant ${tenantId} as ${client.user?.tag}`);
        });

        clients.set(tenantId, client);
        return client;

    } catch (error) {
        logger.error(`[DiscordManager] Failed to initialize client for tenant ${tenantId}:`, error);
        return null;
    }
}

import { ObjectId } from 'mongodb';
