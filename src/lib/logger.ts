/**
 * Structured Logger (Simplified for Next.js)
 * 
 * Sistema de logging estruturado simplificado que funciona perfeitamente
 * com Next.js sem dependências externas problemáticas.
 */

// ==================== CONFIGURAÇÃO ====================

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = LOG_LEVELS[logLevel as LogLevel] ?? LOG_LEVELS.info;

// ==================== HELPERS ====================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= currentLogLevel;
}

function formatLog(level: LogLevel, message: string, context?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: Record<string, any>): void {
  if (!shouldLog(level)) return;

  const formatted = formatLog(level, message, context);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
  }
}

// ==================== LOGGER OBJECT ====================

const logger = {
  error: (message: string | object, context?: Record<string, any>) => {
    if (typeof message === 'object') {
      log('error', JSON.stringify(message), context);
    } else {
      log('error', message, context);
    }
  },
  warn: (message: string | object, context?: Record<string, any>) => {
    if (typeof message === 'object') {
      log('warn', JSON.stringify(message), context);
    } else {
      log('warn', message, context);
    }
  },
  info: (message: string | object, context?: Record<string, any>) => {
    if (typeof message === 'object') {
      log('info', JSON.stringify(message), context);
    } else {
      log('info', message, context);
    }
  },
  debug: (message: string | object, context?: Record<string, any>) => {
    if (typeof message === 'object') {
      log('debug', JSON.stringify(message), context);
    } else {
      log('debug', message, context);
    }
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Log de informação
 */
export function logInfo(message: string, context?: Record<string, any>): void {
  logger.info(message, context);
}

/**
 * Log de erro
 */
export function logError(message: string, error?: Error | unknown, context?: Record<string, any>): void {
  if (error instanceof Error) {
    logger.error(message, { ...context, error });
  } else {
    logger.error(message, { ...context, error: String(error) });
  }
}

/**
 * Log de warning
 */
export function logWarning(message: string, context?: Record<string, any>): void {
  logger.warn(message, context);
}

/**
 * Log de debug
 */
export function logDebug(message: string, context?: Record<string, any>): void {
  logger.debug(message, context);
}

// ==================== CATEGORIAS ESPECÍFICAS ====================

/**
 * Log de autenticação
 */
export function logAuth(action: string, context: {
  userId?: string;
  email?: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  errorMessage?: string;
}): void {
  const level = context.success ? 'info' : 'warn';
  logger[level](`Authentication: ${action}`, {
    category: 'auth',
    action,
    ...context,
  });
}

/**
 * Log de segurança
 */
export function logSecurity(event: string, context: {
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  details?: Record<string, any>;
}): void {
  const level = context.severity === 'critical' || context.severity === 'high' ? 'error' : 'warn';
  logger[level](`Security Event: ${event}`, {
    category: 'security',
    event,
    ...context,
  });
}

/**
 * Log de banco de dados
 */
export function logDatabase(operation: string, context: {
  collection?: string;
  duration?: number;
  error?: Error;
  query?: Record<string, any>;
}): void {
  if (context.error) {
    logger.error(`Database Error: ${operation}`, {
      category: 'database',
      operation,
      ...context,
    });
  } else {
    logger.debug(`Database: ${operation}`, {
      category: 'database',
      operation,
      ...context,
    });
  }
}

/**
 * Log de API externa
 */
export function logExternalAPI(service: string, context: {
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
}): void {
  if (context.error || (context.statusCode && context.statusCode >= 400)) {
    logger.error(`External API Error: ${service}`, {
      category: 'external_api',
      service,
      ...context,
    });
  } else {
    logger.info(`External API: ${service}`, {
      category: 'external_api',
      service,
      ...context,
    });
  }
}

/**
 * Log de webhook
 */
export function logWebhook(gateway: string, context: {
  tenantId?: string;
  eventType?: string;
  success: boolean;
  duration?: number;
  error?: Error;
}): void {
  if (context.success) {
    logger.info(`Webhook processed: ${gateway}`, {
      category: 'webhook',
      gateway,
      ...context,
    });
  } else {
    logger.error(`Webhook failed: ${gateway}`, {
      category: 'webhook',
      gateway,
      ...context,
    });
  }
}

/**
 * Log de performance
 */
export function logPerformance(operation: string, context: {
  duration: number;
  slow?: boolean;
  details?: Record<string, any>;
}): void {
  const level = context.slow ? 'warn' : 'debug';
  logger[level](`Performance: ${operation} (${context.duration}ms)`, {
    category: 'performance',
    operation,
    ...context,
  });
}

/**
 * Log de bot
 */
export function logBot(platform: string, context: {
  tenantId?: string;
  event?: string;
  userId?: string;
  error?: Error;
}): void {
  if (context.error) {
    logger.error(`Bot Error: ${platform}`, {
      category: 'bot',
      platform,
      ...context,
    });
  } else {
    logger.info(`Bot Event: ${platform}`, {
      category: 'bot',
      platform,
      ...context,
    });
  }
}

/**
 * Log de pagamento
 */
export function logPayment(gateway: string, context: {
  tenantId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  transactionId?: string;
  error?: Error;
}): void {
  if (context.error || context.status === 'failed') {
    logger.error(`Payment Failed: ${gateway}`, {
      category: 'payment',
      gateway,
      ...context,
    });
  } else {
    logger.info(`Payment: ${gateway}`, {
      category: 'payment',
      gateway,
      ...context,
    });
  }
}

// ==================== CHILD LOGGER ====================

/**
 * Cria logger com contexto fixo
 * Útil para manter contexto em toda uma requisição/operação
 */
export function createChildLogger(context: Record<string, any>) {
  return {
    error: (msg: string, ctx?: Record<string, any>) => logger.error(msg, { ...context, ...ctx }),
    warn: (msg: string, ctx?: Record<string, any>) => logger.warn(msg, { ...context, ...ctx }),
    info: (msg: string, ctx?: Record<string, any>) => logger.info(msg, { ...context, ...ctx }),
    debug: (msg: string, ctx?: Record<string, any>) => logger.debug(msg, { ...context, ...ctx }),
  };
}

// ==================== EXPORT PADRÃO ====================

export default logger;

// ==================== EXEMPLOS DE USO ====================
// Veja README_SEGURANCA.md para exemplos detalhados de uso do logger

/*
// Exemplo 1: Log simples
logInfo('User registered', { userId: '123', email: 'user@example.com' });

// Exemplo 2: Log de erro
try {
  // ... código
} catch (error) {
  logError('Failed to process payment', error, {
    userId: '123',
    amount: 100,
  });
}

// Exemplo 3: Log de autenticação
logAuth('login.success', {
  userId: '123',
  email: 'user@example.com',
  success: true,
  ip: '192.168.1.1',
});

// Exemplo 4: Log de segurança
logSecurity('rate_limit_exceeded', {
  severity: 'high',
  userId: '123',
  ip: '192.168.1.1',
  details: { endpoint: '/api/login', attempts: 10 },
});

// Exemplo 5: Child logger com contexto
const requestLogger = createChildLogger({
  requestId: 'req-123',
  userId: '456',
});
requestLogger.info('Processing request');
requestLogger.error('Request failed');

// Exemplo 6: Log de performance
const start = Date.now();
// ... operação
const duration = Date.now() - start;
logPerformance('database.query', {
  duration,
  slow: duration > 1000,
  details: { collection: 'users', query: 'findOne' },
});
*/

