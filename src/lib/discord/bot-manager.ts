/**
 * Discord Bot Manager - Multi-tenant
 * Gerencia múltiplas instâncias de bots Discord (uma por tenant)
 */

import { Client } from 'discord.js';
import { createDiscordBotInstance } from './botFactory';
import clientPromise from '@/lib/mongodb';
import type { Tenant } from '@/lib/types';

// Mapa de bots ativos: tenantId -> Client instance
const activeBots = new Map<string, Client>();

/**
 * Inicia um bot Discord para um tenant específico
 */
export async function startDiscordBot(tenantId: string, botToken: string, clientId: string): Promise<{ success: boolean; message: string }> {
    try {
        // Se já existe um bot rodando para este tenant, desconecta primeiro
        if (activeBots.has(tenantId)) {
            console.log(`[Discord Manager] Bot já existe para tenant ${tenantId}, reiniciando...`);
            await stopDiscordBot(tenantId);
        }

        console.log(`[Discord Manager] Iniciando bot para tenant ${tenantId}...`);

        // Cria e inicia o bot
        const client = createDiscordBotInstance(botToken, clientId);
        await client.login(botToken);

        // Aguarda o bot ficar pronto
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout ao conectar bot'));
            }, 15000); // 15 segundos timeout

            client.once('clientReady', () => {
                clearTimeout(timeout);
                console.log(`[Discord Manager] ✅ Bot conectado para tenant ${tenantId} como ${client.user?.tag}`);
                resolve();
            });

            client.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        // Salva na memória
        activeBots.set(tenantId, client);

        console.log(`[Discord Manager] ✅ Bot ativo para tenant ${tenantId}`);
        console.log(`[Discord Manager] Total de bots ativos: ${activeBots.size}`);

        return { success: true, message: `Bot conectado como ${client.user?.tag}` };

    } catch (error: any) {
        console.error(`[Discord Manager] ❌ Erro ao iniciar bot para tenant ${tenantId}:`, error);
        
        // Remove da memória se falhou
        activeBots.delete(tenantId);

        return { 
            success: false, 
            message: error.message || 'Erro ao iniciar bot Discord' 
        };
    }
}

/**
 * Para um bot Discord de um tenant específico
 */
export async function stopDiscordBot(tenantId: string): Promise<void> {
    const client = activeBots.get(tenantId);
    
    if (client) {
        console.log(`[Discord Manager] Parando bot para tenant ${tenantId}...`);
        
        try {
            await client.destroy();
            activeBots.delete(tenantId);
            console.log(`[Discord Manager] ✅ Bot parado para tenant ${tenantId}`);
        } catch (error) {
            console.error(`[Discord Manager] Erro ao parar bot para tenant ${tenantId}:`, error);
            // Remove mesmo se houver erro
            activeBots.delete(tenantId);
        }
    }
}

/**
 * Reinicia um bot Discord
 */
export async function restartDiscordBot(tenantId: string, botToken: string, clientId: string): Promise<{ success: boolean; message: string }> {
    console.log(`[Discord Manager] Reiniciando bot para tenant ${tenantId}...`);
    await stopDiscordBot(tenantId);
    return await startDiscordBot(tenantId, botToken, clientId);
}

/**
 * Verifica se um bot está ativo
 */
export function isBotActive(tenantId: string): boolean {
    const client = activeBots.get(tenantId);
    return client !== undefined && client.isReady();
}

/**
 * Retorna status de todos os bots
 */
export function getAllBotsStatus(): Array<{ tenantId: string; ready: boolean; tag?: string }> {
    const status: Array<{ tenantId: string; ready: boolean; tag?: string }> = [];
    
    for (const [tenantId, client] of activeBots.entries()) {
        status.push({
            tenantId,
            ready: client.isReady(),
            tag: client.user?.tag
        });
    }
    
    return status;
}

/**
 * Inicia todos os bots de tenants ativos no banco
 * (Chamado na inicialização do servidor)
 */
export async function startAllDiscordBots(): Promise<void> {
    console.log('[Discord Manager] 🚀 Iniciando todos os bots Discord...');
    
    try {
        const dbClient = await clientPromise;
        const db = dbClient.db('vematize');
        
        // Busca todos os tenants com bot Discord configurado
        const tenants = await db.collection<Tenant>('tenants').find({
            'connections.discord.botToken': { $exists: true, $ne: null },
            'connections.discord.clientId': { $exists: true, $ne: null },
            subscriptionStatus: { $ne: 'inactive' } // Só inicia bots de tenants ativos
        }).toArray();

        console.log(`[Discord Manager] Encontrados ${tenants.length} tenants com Discord configurado`);

        // Inicia todos os bots em paralelo
        const startPromises = tenants.map(async (tenant) => {
            if (tenant.connections?.discord?.botToken && tenant.connections?.discord?.clientId) {
                try {
                    await startDiscordBot(
                        tenant._id.toString(),
                        tenant.connections.discord.botToken,
                        tenant.connections.discord.clientId
                    );
                } catch (error) {
                    console.error(`[Discord Manager] Erro ao iniciar bot do tenant ${tenant.subdomain}:`, error);
                }
            }
        });

        await Promise.allSettled(startPromises);

        console.log(`[Discord Manager] ✅ ${activeBots.size} bots iniciados com sucesso`);

    } catch (error) {
        console.error('[Discord Manager] ❌ Erro ao iniciar bots:', error);
    }
}

/**
 * Para todos os bots (usado no shutdown do servidor)
 */
export async function stopAllDiscordBots(): Promise<void> {
    console.log('[Discord Manager] 🛑 Parando todos os bots Discord...');
    
    const stopPromises = Array.from(activeBots.keys()).map(tenantId => stopDiscordBot(tenantId));
    await Promise.allSettled(stopPromises);
    
    activeBots.clear();
    console.log('[Discord Manager] ✅ Todos os bots parados');
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
    process.on('SIGINT', async () => {
        console.log('[Discord Manager] Recebido SIGINT, parando bots...');
        await stopAllDiscordBots();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('[Discord Manager] Recebido SIGTERM, parando bots...');
        await stopAllDiscordBots();
        process.exit(0);
    });
}


