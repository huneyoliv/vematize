/**
 * Cliente para comunicação com o Bot Service
 * Centraliza todas as chamadas HTTP para o backend de bots
 */

/**
 * Deriva automaticamente a URL do bot-service a partir da URL principal
 */
function getBotServiceUrl(): string {
  // Se BOT_SERVICE_URL foi definida explicitamente, usa ela (útil para desenvolvimento local)
  if (process.env.BOT_SERVICE_URL) {
    return process.env.BOT_SERVICE_URL;
  }

  const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    // Fallback for when neither is defined (e.g. during build or some edge cases)
    // But ideally BASE_URL should be defined in .env
    console.warn('BASE_URL or NEXT_PUBLIC_BASE_URL not defined, defaulting to localhost');
    return 'http://localhost:8080';
  }

  // Para localhost, usa porta diferente
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return 'http://localhost:8080'; // Porta padrão do bot-service
  }

  // Para produção, adiciona subdomínio "api"
  // https://swaptune.me -> https://api.swaptune.me
  return baseUrl.replace('://', '://api.');
}

const BOT_SERVICE_URL = getBotServiceUrl();
const API_SECRET_KEY = process.env.BOT_SERVICE_API_KEY || '';

// Log da configuração (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log('[Bot Service Client] URL:', BOT_SERVICE_URL);
}

/**
 * Configuração padrão para requisições ao bot-service
 */
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_SECRET_KEY}`,
  };
}

/**
 * Configuração automática do webhook do Telegram
 */
export async function configureTelegramWebhook(
  botToken: string,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/telegram/configure`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ botToken, tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao configurar webhook do Telegram:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Obtém informações do webhook do Telegram
 */
export async function getTelegramWebhookInfo(
  botToken: string
): Promise<{ success: boolean; webhookInfo?: any; message?: string }> {
  try {
    const response = await fetch(
      `${BOT_SERVICE_URL}/api/v1/bots/telegram/webhook-info?botToken=${encodeURIComponent(botToken)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao obter informações do webhook:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Remove o webhook do Telegram
 */
export async function removeTelegramWebhook(
  botToken: string,
  tenantId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/telegram/webhook`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ botToken, tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao remover webhook do Telegram:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Obtém a URL de interactions do Discord
 * Cria ou retorna a URL do endpoint HTTP Interactions
 */
export async function getDiscordInteractionsUrl(
  tenantId: string
): Promise<{ success: boolean; interactionsUrl?: string; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/discord/get-interactions-url`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao obter URL de interactions do Discord:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Regenera o token de interactions do Discord
 * Útil se o token antigo foi comprometido
 */
export async function regenerateDiscordInteractionsToken(
  tenantId: string
): Promise<{ success: boolean; interactionsUrl?: string; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/discord/regenerate-token`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao regenerar token de interactions:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Obtém a URL de interactions do Discord (migração para bot-service)
 * Nova função que aponta para o bot-service ao invés do Next.js
 */
export async function getBotServiceInteractionsUrl(
  tenantId: string
): Promise<{ success: boolean; interactionsUrl?: string; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/discord/get-interactions-url`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao obter URL de interactions do bot-service:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}

/**
 * Regenera a URL de interactions do Discord (migração para bot-service)
 * Nova função que aponta para o bot-service ao invés do Next.js
 */
export async function regenerateBotServiceInteractionsUrl(
  tenantId: string
): Promise<{ success: boolean; interactionsUrl?: string; message: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/bots/discord/regenerate-token`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tenantId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Bot Service Client] Erro ao regenerar URL de interactions do bot-service:', error);
    return {
      success: false,
      message: 'Erro ao conectar com o serviço de bots.',
    };
  }
}



/**
 * Obtém a lista de servidores do Discord onde o bot está presente
 */
export async function getDiscordGuilds(botToken: string): Promise<{ success: boolean; guilds?: any[]; message?: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/discord/api/guilds`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ botToken }),
    });

    return await response.json();
  } catch (error) {
    console.error('[Bot Service Client] Erro ao buscar servidores:', error);
    return { success: false, message: 'Erro ao conectar com o serviço de bots.' };
  }
}

/**
 * Obtém dados de um servidor específico (canais, cargos, categorias)
 */
export async function getDiscordGuildData(botToken: string, guildId: string): Promise<{ success: boolean; guild?: any; channels?: any[]; categories?: any[]; roles?: any[]; message?: string }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/discord/api/guild/${guildId}/data`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ botToken }),
    });

    return await response.json();
  } catch (error) {
    console.error('[Bot Service Client] Erro ao buscar dados do servidor:', error);
    return { success: false, message: 'Erro ao conectar com o serviço de bots.' };
  }
}

/**
 * Publica painéis de vendas no Discord
 */
export async function publishDiscordPanels(tenantId: string, panelId?: string): Promise<{ success: boolean; message: string; results?: any[] }> {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/api/v1/discord/api/panels/publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tenantId, panelId }),
    });

    return await response.json();
  } catch (error) {
    console.error('[Bot Service Client] Erro ao publicar painéis:', error);
    return { success: false, message: 'Erro ao conectar com o serviço de bots.' };
  }
}
export class BotServiceClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_SECRET_KEY}`,
    };
  }

  async post(endpoint: string, body: any) {
    const url = `${BOT_SERVICE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return await response.json();
  }

  async get(endpoint: string) {
    const url = `${BOT_SERVICE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return await response.json();
  }
}
