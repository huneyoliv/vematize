'use server';

import clientPromise from '@/lib/mongodb';
import type { Tenant } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { Platform } from './platform-config';
import { z } from 'zod';
import { BotConfigSchema } from '@/lib/schemas';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export type BotConnections = {
    [key in Platform]?: { [key: string]: string };
};
export type ConnectionDetails = { [key: string]: string } | undefined;


export async function getBotConnections(): Promise<BotConnections> {
  try {
    // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
    await requireTenantAccess(subdomain);

    const client = await clientPromise;
    const db = client.db('vematize');
    
    const tenantsCollection = db.collection('tenants');
    // Tenant já obtido da sessão

    if (!tenant) {
      return {};
    }

    return tenant.connections || {};

  } catch (error) {
    console.error('Database Error fetching bot connections:', error);
    return {};
  }
}

export async function getBotConnectionDetails(platform: Platform): Promise<ConnectionDetails> {
  try {
    // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
    await requireTenantAccess(subdomain);

    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');
    const tenant = await tenantsCollection.findOne(
      { subdomain },
      { projection: { [`connections.${platform}`]: 1 } }
    );
    if (!tenant || !tenant.connections) {
      return undefined;
    }
    return tenant.connections[platform];
  } catch (error) {
    console.error(`Database Error fetching details for ${platform}:`, error);
    return undefined;
  }
}


export async function saveBotConnection(
    subdomain: string, 
    platform: Platform, 
    data: { [key: string]: string }
): Promise<{success: boolean; message: string}> {
    try {
        // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
        await requireTenantAccess(subdomain);

        if (!subdomain || !platform || !data) {
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
            { subdomain },
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
        
        // Para Discord, apenas confirmação simples
        if (platform === 'discord') {
            successMessage = 'Bot do Discord conectado com sucesso!';
        }


        revalidatePath('/bots');
        revalidatePath(`/${subdomain}/bots/${platform}`);
        return { success: true, message: successMessage };

    } catch (error) {
        console.error('Database Error saving bot connection:', error);
        return { success: false, message: 'Erro ao salvar a conexão.' };
    }
}

export async function getBotConfig(): Promise<z.infer<typeof BotConfigSchema> | null> {
  try {
    // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
    await requireTenantAccess(subdomain);

    const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection<Tenant>('tenants');
        const tenant = await tenantsCollection.findOne(
            { subdomain },
            { projection: { botConfig: 1 } }
        );

        const parseResult = BotConfigSchema.safeParse(tenant?.botConfig);
        
        if (parseResult.success) {
            return parseResult.data;
        }

        if(tenant?.botConfig) {
            console.warn(`Bot config for subdomain "${subdomain}" has outdated structure and will be reset.`);
        }

        return null;
        
    } catch (error) {
        console.error('Database Error fetching bot config:', error);
        return null;
    }
}

export async function saveBotConfig(
    subdomain: string,
    data: z.infer<typeof BotConfigSchema>
): Promise<{success: boolean; message: string}> {
    try {
        // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
        await requireTenantAccess(subdomain);

        const validatedData = BotConfigSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const updateResult = await tenantsCollection.updateOne(
            { subdomain },
            { $set: { botConfig: validatedData } }
        );

        if (updateResult.matchedCount === 0) {
            return { success: false, message: 'Cliente não encontrado.' };
        }

        revalidatePath(`/${subdomain}/bots/telegram`);
        revalidatePath(`/${subdomain}/bots/discord`);
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
        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection<Tenant>('tenants');
        const tenant = await tenantsCollection.findOne(
            { subdomain },
            { projection: { discordSettings: 1 } }
        );

        return tenant?.discordSettings || null;
    } catch (error) {
        console.error('Database Error fetching Discord settings:', error);
        return null;
    }
}

export async function saveDiscordSettings(
    subdomain: string,
    data: any
): Promise<{success: boolean; message: string}> {
    try {
        const { DiscordSettingsSchema } = await import('@/lib/schemas');
        const validatedData = DiscordSettingsSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const updateResult = await tenantsCollection.updateOne(
            { subdomain },
            { $set: { discordSettings: validatedData } }
        );

        if (updateResult.matchedCount === 0) {
            return { success: false, message: 'Cliente não encontrado.' };
        }

        revalidatePath(`/${subdomain}/bots/discord`);
        return { success: true, message: 'Configurações do Discord salvas com sucesso!' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Database Error saving Discord settings:', error);
        return { success: false, message: 'Erro ao salvar as configurações do Discord.' };
    }
}
