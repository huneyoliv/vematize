/**
 * Rate Limiter Avançado
 * 
 * Sistema de rate limiting específico por endpoint com diferentes
 * estratégias e armazenamento em memória (pode migrar para Redis)
 */

// ==================== TIPOS ====================

export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket';

export type RateLimitConfig = {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requisições
  strategy?: RateLimitStrategy;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
  firstRequest: number;
};

// ==================== STORAGE ====================

// Armazenamento em memória (para produção, migrar para Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Limpeza automática a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ==================== CONFIGURAÇÕES POR ENDPOINT ====================

export const RATE_LIMIT_CONFIGS = {
  // Login: 5 tentativas por minuto
  login: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: 'Muitas tentativas de login. Aguarde 1 minuto.',
  } as RateLimitConfig,

  // Registro: 3 tentativas por hora
  register: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: 'Limite de registros atingido. Aguarde 1 hora.',
  } as RateLimitConfig,

  // API geral: 100 requisições por minuto
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Limite de requisições atingido. Aguarde um momento.',
  } as RateLimitConfig,

  // Webhooks: 50 requisições por minuto
  webhook: {
    windowMs: 60 * 1000,
    maxRequests: 50,
    message: 'Limite de webhooks atingido.',
  } as RateLimitConfig,

  // Operações sensíveis: 10 por hora
  sensitive: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: 'Limite de operações sensíveis atingido. Aguarde 1 hora.',
  } as RateLimitConfig,

  // Password reset: 3 tentativas por hora
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: 'Limite de recuperação de senha atingido. Aguarde 1 hora.',
  } as RateLimitConfig,

  // Email sending: 5 por hora
  emailSending: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'Limite de envio de e-mails atingido. Aguarde 1 hora.',
  } as RateLimitConfig,
} as const;

// ==================== RATE LIMITER ====================

/**
 * Verifica rate limit para um identificador
 * @param identifier - Identificador único (userId, IP, email, etc)
 * @param config - Configuração do rate limit
 * @returns Resultado indicando se a requisição é permitida
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;

  const entry = rateLimitStore.get(key);

  // Primeira requisição ou janela expirada
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;

    rateLimitStore.set(key, {
      count: 1,
      resetAt,
      firstRequest: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Verifica se excedeu o limite
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    };
  }

  // Incrementa contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

// ==================== HELPERS ESPECÍFICOS ====================

/**
 * Rate limit para login
 * Usa email + IP para identificar
 */
export function checkLoginRateLimit(email: string, ip: string): RateLimitResult {
  const identifier = `login:${email}:${ip}`;
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.login);
}

/**
 * Rate limit para registro
 * Usa IP para identificar
 */
export function checkRegisterRateLimit(ip: string): RateLimitResult {
  const identifier = `register:${ip}`;
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.register);
}

/**
 * Rate limit para operações sensíveis
 * Usa userId para identificar
 */
export function checkSensitiveOperationRateLimit(userId: string): RateLimitResult {
  const identifier = `sensitive:${userId}`;
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.sensitive);
}

/**
 * Rate limit para webhooks
 * Usa tenantId + gateway para identificar
 */
export function checkWebhookRateLimit(tenantId: string, gateway: string): RateLimitResult {
  const identifier = `webhook:${tenantId}:${gateway}`;
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.webhook);
}

/**
 * Rate limit para password reset
 * Usa email + IP para identificar
 */
export function checkPasswordResetRateLimit(email: string, ip: string): RateLimitResult {
  const identifier = `password-reset:${email}:${ip}`;
  return checkRateLimit(identifier, RATE_LIMIT_CONFIGS.passwordReset);
}

// ==================== MANUAL MANAGEMENT ====================

/**
 * Reseta rate limit para um identificador específico
 * Útil para testes ou casos especiais
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Bloqueia um identificador permanentemente (até restart)
 * Útil para IPs maliciosos
 */
export function blockIdentifier(identifier: string, durationMs: number = 24 * 60 * 60 * 1000): void {
  rateLimitStore.set(identifier, {
    count: 999999,
    resetAt: Date.now() + durationMs,
    firstRequest: Date.now(),
  });
}

/**
 * Verifica se um identificador está bloqueado
 */
export function isBlocked(identifier: string): boolean {
  const entry = rateLimitStore.get(identifier);
  if (!entry) return false;

  return entry.count >= 999999 && Date.now() < entry.resetAt;
}

/**
 * Obtém estatísticas de rate limit para um identificador
 */
export function getRateLimitStats(identifier: string): {
  requestCount: number;
  resetAt: Date | null;
  isBlocked: boolean;
} | null {
  const entry = rateLimitStore.get(identifier);
  
  if (!entry) {
    return null;
  }

  return {
    requestCount: entry.count,
    resetAt: new Date(entry.resetAt),
    isBlocked: entry.count >= 999999,
  };
}

// ==================== MIDDLEWARE WRAPPER ====================

/**
 * Wrapper para server actions com rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  config: RateLimitConfig,
  identifierFn: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = identifierFn(...args);
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      throw new Error(config.message || 'Rate limit exceeded');
    }

    return handler(...args);
  }) as T;
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Verificação direta
export async function loginUser(email: string, password: string, ip: string) {
  const rateLimit = checkLoginRateLimit(email, ip);
  
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: RATE_LIMIT_CONFIGS.login.message,
      retryAfter: rateLimit.retryAfter,
    };
  }
  
  // ... lógica de login
}

// Exemplo 2: Wrapper automático
export const sendEmail = withRateLimit(
  async (userId: string, to: string, subject: string) => {
    // ... lógica de envio
  },
  RATE_LIMIT_CONFIGS.emailSending,
  (userId) => `email:${userId}`
);

// Exemplo 3: Bloqueio manual
if (suspiciousActivity) {
  blockIdentifier(`ip:${userIp}`, 24 * 60 * 60 * 1000); // 24 horas
}
*/

