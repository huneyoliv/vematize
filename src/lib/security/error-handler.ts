/**
 * Secure Error Handler
 * 
 * Sistema centralizado de tratamento de erros que:
 * - Nunca expõe stack traces ou informações sensíveis em produção
 * - Retorna mensagens genéricas para usuários
 * - Loga erros detalhados server-side para debugging
 * - Previne information leakage
 */

import { ZodError } from 'zod';

// ==================== TIPOS ====================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SafeError = {
  success: false;
  message: string;
  code?: string;
  statusCode?: number;
};

export type ErrorContext = {
  userId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
};

// ==================== MENSAGENS GENÉRICAS ====================

const GENERIC_ERROR_MESSAGES = {
  unauthorized: 'Não autorizado. Faça login para continuar.',
  forbidden: 'Você não tem permissão para acessar este recurso.',
  not_found: 'Recurso não encontrado.',
  validation_error: 'Dados inválidos. Verifique os campos e tente novamente.',
  rate_limit: 'Muitas requisições. Aguarde um momento e tente novamente.',
  server_error: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
  database_error: 'Erro ao acessar o banco de dados. Tente novamente mais tarde.',
  external_service_error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
};

// ==================== ERROR HANDLER ====================

/**
 * Trata erros de forma segura sem expor informações sensíveis
 * @param error - Erro capturado
 * @param context - Contexto da operação para logging
 * @returns Erro sanitizado para enviar ao cliente
 */
export function handleError(error: unknown, context?: ErrorContext): SafeError {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log detalhado server-side (NUNCA enviar ao cliente!)
  logErrorServerSide(error, context);

  // ===== ERROS DE VALIDAÇÃO (ZOD) =====
  if (error instanceof ZodError) {
    // Em produção: mensagem genérica
    if (isProduction) {
      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.validation_error,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      };
    }

    // Em desenvolvimento: detalhes específicos
    return {
      success: false,
      message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  // ===== ERROS CONHECIDOS (com mensagens seguras) =====
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Unauthorized
    if (errorMessage.includes('unauthorized') || errorMessage.includes('não autorizado')) {
      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.unauthorized,
        code: 'UNAUTHORIZED',
        statusCode: 401,
      };
    }

    // Forbidden
    if (errorMessage.includes('forbidden') || errorMessage.includes('acesso negado')) {
      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.forbidden,
        code: 'FORBIDDEN',
        statusCode: 403,
      };
    }

    // Not Found
    if (errorMessage.includes('not found') || errorMessage.includes('não encontrado')) {
      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.not_found,
        code: 'NOT_FOUND',
        statusCode: 404,
      };
    }

    // Database errors
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('mongodb') ||
      errorMessage.includes('connection')
    ) {
      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.database_error,
        code: 'DATABASE_ERROR',
        statusCode: 503,
      };
    }
  }

  // ===== ERRO GENÉRICO (padrão) =====
  // Em produção: mensagem completamente genérica
  if (isProduction) {
    return {
      success: false,
      message: GENERIC_ERROR_MESSAGES.server_error,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  // Em desenvolvimento: mais informações (mas ainda sem stack trace)
  return {
    success: false,
    message: error instanceof Error ? error.message : 'Erro desconhecido',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

// ==================== LOGGING SERVER-SIDE ====================

/**
 * Loga erro completo no servidor (com stack trace e contexto)
 * NUNCA chamar do cliente!
 */
function logErrorServerSide(error: unknown, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();
  const errorId = generateErrorId();

  // Log estruturado
  const logEntry = {
    errorId,
    timestamp,
    context,
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
    },
  };

  // Em produção: use um serviço como Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrar com Sentry ou outro serviço
    console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
    
    // Aqui você integraria com Sentry:
    // Sentry.captureException(error, { contexts: { custom: context } });
  } else {
    // Em desenvolvimento: log completo no console
    console.error('═'.repeat(80));
    console.error(`🚨 ERROR [${errorId}] - ${timestamp}`);
    console.error('═'.repeat(80));
    
    if (context) {
      console.error('📝 Context:', context);
    }
    
    console.error('❌ Error:', error);
    
    if (error instanceof Error && error.stack) {
      console.error('📚 Stack Trace:');
      console.error(error.stack);
    }
    
    console.error('═'.repeat(80));
  }
}

// ==================== HELPERS ====================

/**
 * Gera ID único para rastreamento de erros
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrapper para server actions com tratamento de erros
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  context?: Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error, context);
    }
  }) as T;
}

/**
 * Verifica se um erro é de autorização
 */
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('não autorizado') ||
    message.includes('acesso negado')
  );
}

// ==================== RATE LIMIT ERROR ====================

/**
 * Cria erro de rate limit
 */
export function createRateLimitError(retryAfter?: number): SafeError {
  return {
    success: false,
    message: retryAfter
      ? `Muitas requisições. Tente novamente em ${retryAfter} segundos.`
      : GENERIC_ERROR_MESSAGES.rate_limit,
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  };
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Server Action com tratamento de erro
export async function deleteProduct(productId: string) {
  try {
    // ... lógica
    return { success: true };
  } catch (error) {
    return handleError(error, {
      action: 'deleteProduct',
      resource: productId,
      userId: session.userId,
    });
  }
}

// Exemplo 2: Wrapper automático
export const deleteProduct = withErrorHandling(
  async (productId: string) => {
    // ... lógica
    return { success: true };
  },
  { action: 'deleteProduct' }
);
*/

