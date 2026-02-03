'use server';

import clientPromise from '@/lib/mongodb';
import type { Tenant } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { Platform } from './platform-config';
import { z } from 'zod';
import { BotConfigSchema } from '@/lib/schemas';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { ObjectId } from 'mongodb';

import { configureTelegramWebhook, getBotServiceInteractionsUrl, regenerateBotServiceInteractionsUrl } from '@/lib/bot-service-client';

export type BotConnections = {
    [key in Platform]?: { [key: string]: string };
};
export type ConnectionDetails = { [key: string]: string } | undefined;


export async function getBotConnections(): Promise<BotConnections> {
    try {
        const tenant = await getTenantFromSession();
        return tenant.connections || {};
    } catch (error) {
        console.error('Database Error fetching bot connections:', error);
        return {};
    }
}

/**
 * Busca o plano atual do tenant para verificar acesso a plataformas
 */
export async function getCurrentPlan(): Promise<{ allowedPlatforms?: string[] } | null> {
    try {
        const tenant = await getTenantFromSession();

        if (!tenant.planId) {
            return null;
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const plansCollection = db.collection('plans');

        const plan = await plansCollection.findOne({ _id: new ObjectId(tenant.planId) });

        if (!plan) {
            return null;
        }

        return {
            allowedPlatforms: plan.allowedPlatforms || []
        };
    } catch (error) {
        console.error('Database Error fetching current plan:', error);
        return null;
    }
}

export async function getBotConnectionDetails(platform: Platform): Promise<ConnectionDetails> {
    try {
        const tenant = await getTenantFromSession();
        return tenant.connections?.[platform as keyof typeof tenant.connections];
    } catch (error) {
        console.error(`Database Error fetching details for ${platform}:`, error);
        return undefined;
    }
}


// Gateway desabilitado - usando HTTP Interactions
// import { startDiscordBot, restartDiscordBot, isBotActive } from '@/lib/discord/bot-manager';

export async function saveBotConnection(
    platform: Platform,
    data: { [key: string]: string }
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();

        if (!platform || !data) {
            return { success: false, message: 'Dados inválidos fornecidos.' };
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const sanitizedData: { [key: string]: string } = {};
        for (const key in data) {
            if (data[key]) {
                sanitizedData[key] = data[key];
            }
        }

        // ===== VALIDAÇÃO: Token único por plataforma =====
        // Impede que dois tenants usem o mesmo bot token
        if (platform === 'telegram' && sanitizedData.botToken) {
            const existingTenant = await tenantsCollection.findOne({
                "connections.telegram.botToken": sanitizedData.botToken,
                _id: { $ne: new ObjectId(tenant._id) } // Exclui o próprio tenant
            });

            if (existingTenant) {
                return {
                    success: false,
                    message: 'Este token do Telegram já está sendo usado por outro tenant. Cada bot deve ter um token único.'
                };
            }
        }

        if (platform === 'discord' && sanitizedData.botToken) {
            const existingTenant = await tenantsCollection.findOne({
                "connections.discord.botToken": sanitizedData.botToken,
                _id: { $ne: new ObjectId(tenant._id) }
            });

            if (existingTenant) {
                return {
                    success: false,
                    message: 'Este token do Discord já está sendo usado por outro tenant. Cada bot deve ter um token único.'
                };
            }
        }

        const updateResult = await tenantsCollection.updateOne(
            { _id: new ObjectId(tenant._id) },
            { $set: { [`connections.${platform}`]: sanitizedData } }
        );

        if (updateResult.matchedCount === 0) {
            return { success: false, message: 'Cliente não encontrado.' };
        }

        let successMessage = 'Conexão salva com sucesso!';

        // Configurar webhook apenas para Telegram (usando bot-service)
        if (platform === 'telegram' && sanitizedData.botToken) {
            console.log('[Actions] Configurando webhook do Telegram via bot-service...');

            const webhookResult = await configureTelegramWebhook(
                sanitizedData.botToken,
                tenant._id.toString()
            );

            if (!webhookResult.success) {
                console.error('Failed to configure Telegram webhook:', webhookResult.message);
                return {
                    success: false,
                    message: `Conexão salva, mas falha ao configurar webhook: ${webhookResult.message}`
                };
            }

            successMessage = 'Conexão salva e webhook do Telegram ativado com sucesso via bot-service!';
        }

        // Para Discord, apenas confirmação simples (HTTP Interactions)
        if (platform === 'discord') {
            successMessage = 'Bot do Discord conectado com sucesso! Configure o Interactions Endpoint URL na próxima etapa.';
        }

        revalidatePath('/bots');
        revalidatePath(`/bots/${platform}`);
        return { success: true, message: successMessage };

    } catch (error) {
        console.error('Database Error saving bot connection:', error);
        return { success: false, message: 'Erro ao salvar a conexão.' };
    }
}

export async function getBotConfig(): Promise<z.infer<typeof BotConfigSchema> | null> {
    try {
        const tenant = await getTenantFromSession();
        const parseResult = BotConfigSchema.safeParse(tenant.botConfig);

        if (parseResult.success) {
            return parseResult.data;
        }

        if (tenant.botConfig) {
            console.warn(`Bot config for tenant has outdated structure and will be reset.`);
        }

        return null;

    } catch (error) {
        console.error('Database Error fetching bot config:', error);
        return null;
    }
}

export async function saveBotConfig(
    data: z.infer<typeof BotConfigSchema>
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();
        const validatedData = BotConfigSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const updateResult = await tenantsCollection.updateOne(
            { _id: new ObjectId(tenant._id) },
            { $set: { botConfig: validatedData } }
        );

        if (updateResult.matchedCount === 0) {
            return { success: false, message: 'Cliente não encontrado.' };
        }

        revalidatePath('/bots/telegram');
        revalidatePath('/bots/discord');
        return { success: true, message: 'Fluxo do bot salvo com sucesso!' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Database Error saving bot config:', error);
        return { success: false, message: 'Erro ao salvar as configurações do fluxo.' };
    }
}

export async function getDiscordSettings() {
    try {
        const tenant = await getTenantFromSession();
        return tenant.discordSettings || null;
    } catch (error) {
        console.error('Database Error fetching Discord settings:', error);
        return null;
    }
}

export async function saveDiscordSettings(
    data: any
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();
        const { DiscordSettingsSchema } = await import('@/lib/schemas');

        // Converte "none" em undefined para campos opcionais
        const processedData = {
            ...data,
            cartCategoryId: data.cartCategoryId === 'none' ? undefined : data.cartCategoryId,
            salesLogChannelId: data.salesLogChannelId === 'none' ? undefined : data.salesLogChannelId,
        };

        const validatedData = DiscordSettingsSchema.parse(processedData);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const updateResult = await tenantsCollection.updateOne(
            { _id: new ObjectId(tenant._id) },
            { $set: { discordSettings: validatedData } }
        );

        if (updateResult.matchedCount === 0) {
            return { success: false, message: 'Cliente não encontrado.' };
        }

        revalidatePath('/bots/discord');
        return { success: true, message: 'Configurações do Discord salvas com sucesso!' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Database Error saving Discord settings:', error);
        return { success: false, message: 'Erro ao salvar as configurações do Discord.' };
    }
}
// Discord Interactions Token Management
export async function getInteractionsUrl(): Promise<{ success: boolean; url?: string; token?: string; message?: string }> {
    try {
        const tenant = await getTenantFromSession();
        const { getBotServiceInteractionsUrl } = await import('@/lib/bot-service-client');

        const result = await getBotServiceInteractionsUrl(tenant._id.toString());

        if (result.success && result.interactionsUrl) {
            // Extract token from URL if needed, or just return URL
            const token = result.interactionsUrl.split('/').pop();
            return {
                success: true,
                url: result.interactionsUrl,
                token
            };
        }

        return {
            success: false,
            message: result.message || 'Erro ao obter URL'
        };
    } catch (error) {
        console.error('[Get Interactions URL] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Erro ao obter URL'
        };
    }
}

export async function regenerateInteractionsUrl(): Promise<{ success: boolean; url?: string; token?: string; message?: string }> {
    try {
        const tenant = await getTenantFromSession();
        const { regenerateBotServiceInteractionsUrl } = await import('@/lib/bot-service-client');

        const result = await regenerateBotServiceInteractionsUrl(tenant._id.toString());

        if (result.success && result.interactionsUrl) {
            const token = result.interactionsUrl.split('/').pop();
            revalidatePath('/bots/discord');
            return {
                success: true,
                url: result.interactionsUrl,
                token,
                message: 'URL regenerada com sucesso!'
            };
        }

        return {
            success: false,
            message: result.message || 'Erro ao regenerar URL'
        };
    } catch (error) {
        console.error('[Regenerate Interactions URL] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Erro ao regenerar URL'
        };
    }
}

export async function fetchDiscordGuilds(botToken: string) {
    try {
        const { getDiscordGuilds } = await import('@/lib/bot-service-client');
        return await getDiscordGuilds(botToken);
    } catch (error) {
        console.error('[Actions] Error fetching guilds:', error);
        return { success: false, message: 'Erro ao buscar servidores.' };
    }
}

export async function fetchDiscordGuildData(botToken: string, guildId: string) {
    try {
        const { getDiscordGuildData } = await import('@/lib/bot-service-client');
        return await getDiscordGuildData(botToken, guildId);
    } catch (error) {
        console.error('[Actions] Error fetching guild data:', error);
        return { success: false, message: 'Erro ao buscar dados do servidor.' };
    }
}

export async function publishPanels(panelId?: string) {
    try {
        const tenant = await getTenantFromSession();
        const { publishDiscordPanels } = await import('@/lib/bot-service-client');
        return await publishDiscordPanels(tenant._id.toString(), panelId);
    } catch (error) {
        console.error('[Actions] Error publishing panels:', error);
        return { success: false, message: 'Erro ao publicar painéis.' };
    }
}
