/**
 * Rate Limiter para Webhooks
 * Implementa controle de taxa estrito para webhooks não confiáveis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  burstCount: number;
  burstResetAt: number;
}

// Armazenamento em memória (para produção, usar Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  requestsPerSecond: number; // Ex: 1
  burstLimit: number; // Ex: 3
  windowMs: number; // Janela de tempo em ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Verifica se uma requisição deve ser permitida baseado em rate limiting
 * @param key - Chave única para identificar a origem (ex: subdomain ou IP)
 * @param config - Configuração de rate limiting
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {
    requestsPerSecond: 1,
    burstLimit: 3,
    windowMs: 1000,
  }
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Primeira requisição ou entrada expirada
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
      burstCount: 1,
      burstResetAt: now + 10000, // Burst de 10 segundos
    });

    return {
      allowed: true,
      remaining: config.requestsPerSecond - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Verifica burst limit (3 requisições em 10 segundos)
  if (now >= entry.burstResetAt) {
    entry.burstCount = 0;
    entry.burstResetAt = now + 10000;
  }

  if (entry.burstCount >= config.burstLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.burstResetAt,
      retryAfter: Math.ceil((entry.burstResetAt - now) / 1000),
    };
  }

  // Verifica rate normal
  if (entry.count >= config.requestsPerSecond) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Incrementa contadores
  entry.count++;
  entry.burstCount++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.requestsPerSecond - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Limpa entradas antigas do store (deve ser chamado periodicamente)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt && now >= entry.burstResetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Limpar store a cada 5 minutos
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

