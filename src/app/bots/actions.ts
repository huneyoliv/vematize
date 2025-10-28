'use server';

import clientPromise from '@/lib/mongodb';
import type { Tenant } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { Platform } from './platform-config';
import { z } from 'zod';
import { BotConfigSchema } from '@/lib/schemas';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { ObjectId } from 'mongodb';
import { getOrCreateInteractionsToken, regenerateInteractionsToken } from '@/lib/discord/interactions-token';

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
): Promise<{success: boolean; message: string}> {
    try {
        const tenant = await getTenantFromSession();

        if (!platform || !data) {
            return { success: false, message: 'Dados inválidos fornecidos.' };
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const sanitizedData: {[key: string]: string} = {};
        for (const key in data) {
            if (data[key]) {
                sanitizedData[key] = data[key];
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
        
        // Configurar webhook apenas para Telegram
        if (platform === 'telegram' && sanitizedData.botToken) {
            const appUrl = process.env.APP_URL;
            
            if (!appUrl) {
                console.error("APP_URL environment variable not set. Cannot configure Telegram webhook.");
                successMessage += ' No entanto, o webhook do Telegram não pôde ser configurado (APP_URL não definida no servidor).';
            } else {
                const webhookUrl = `${appUrl}/api/telegram-hook?token=${encodeURIComponent(sanitizedData.botToken)}`;
                const telegramApiUrl = `https://api.telegram.org/bot${sanitizedData.botToken}/setWebhook`;

                const response = await fetch(telegramApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] })
                });
                const result = await response.json();

                if (result.ok) {
                    successMessage = 'Conexão salva e webhook do Telegram ativado com sucesso!';
                } else {
                    console.error('Failed to set Telegram webhook:', result.description);
                    const userMessage = result.description?.includes("bot token") 
                       ? "O token do bot parece ser inválido."
                       : result.description || "Erro desconhecido";
                    return { success: false, message: `Falha ao ativar o webhook: ${userMessage}` };
                }
            }
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

    if(tenant.botConfig) {
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
): Promise<{success: boolean; message: string}> {
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
): Promise<{success: boolean; message: string}> {
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
        const token = await getOrCreateInteractionsToken(tenant._id);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://swaptune.me';
        const url = `${baseUrl}/api/discord-bot/interactions/${token}`;

        return {
            success: true,
            url,
            token
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
        const token = await regenerateInteractionsToken(tenant._id);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://swaptune.me';
        const url = `${baseUrl}/api/discord-bot/interactions/${token}`;

        revalidatePath('/bots/discord');

        return {
            success: true,
            url,
            token,
            message: 'URL regenerada com sucesso!'
        };
    } catch (error) {
        console.error('[Regenerate Interactions URL] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Erro ao regenerar URL'
        };
    }
}

