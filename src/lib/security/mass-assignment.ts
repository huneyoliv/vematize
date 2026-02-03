/**
 * Mass Assignment Protection
 * 
 * Protege contra mass assignment attacks através de whitelists explícitas
 * de campos permitidos para cada operação.
 * 
 * NUNCA permita binding direto de req.body ou form data sem validação!
 */

import { z } from 'zod';

// ==================== WHITELIST DE CAMPOS ====================

/**
 * Campos permitidos para criação de produtos
 */
export const PRODUCT_CREATE_WHITELIST = [
  'name',
  'description',
  'price',
  'discountPrice',
  'type',
  'durationDays',
  'isTelegramGroupAccess',
  'telegramGroupId',
  'productSubtype',
  'stock',
  'activationCodes',
  'hostedFileUrl',
  'offerExpiresAt',
  'paymentMethods',
  'isActive',
] as const;

/**
 * Campos permitidos para atualização de produtos
 * (remove campos que não devem ser modificáveis após criação)
 */
export const PRODUCT_UPDATE_WHITELIST = [
  'name',
  'description',
  'price',
  'discountPrice',
  'durationDays',
  'isTelegramGroupAccess',
  'telegramGroupId',
  'stock',
  'activationCodes',
  'hostedFileUrl',
  'offerExpiresAt',
  'paymentMethods',
  'isActive',
] as const;

/**
 * Campos permitidos para configuração de bot
 */
export const BOT_CONFIG_WHITELIST = [
  'flows',
  'inactiveSubscriptionMessage',
  'deliveryMessage',
] as const;

/**
 * Campos permitidos para conexão de bot (genérico)
 */
export const BOT_CONNECTION_WHITELIST = [
  'botToken',
  'botUsername',
  'publicKey',
  'applicationId',
] as const;

/**
 * Campos permitidos para atualização de tenant (pelo próprio tenant)
 */
export const TENANT_SELF_UPDATE_WHITELIST = [
  'ownerName',
  'ownerEmail',
  // NÃO permitir: subscriptionStatus, subscriptionEndsAt, currentPlan, etc.
] as const;

/**
 * Campos permitidos para atualização de tenant (pelo admin)
 */
export const TENANT_ADMIN_UPDATE_WHITELIST = [
  'ownerName',
  'ownerEmail',
  'subscriptionStatus',
  'subscriptionEndsAt',
  'currentPlan',
  'trialEndsAt',
] as const;

/**
 * Campos permitidos para integrações de pagamento
 */
export const PAYMENT_INTEGRATION_WHITELIST = [
  'mode',
  'sandbox_public_key',
  'sandbox_access_token',
  'sandbox_webhook_secret',
  'production_public_key',
  'production_access_token',
  'production_webhook_secret',
  'success_url',
  'failure_url',
  'pending_url',
  'cancel_url',
] as const;

/**
 * Campos readonly que NUNCA devem ser modificáveis pelo usuário
 */
export const READONLY_FIELDS = [
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  'passwordHash',
  'tenantId',
  'userId',
] as const;

// ==================== FUNÇÕES DE FILTRAGEM ====================

type Whitelist = readonly string[];

/**
 * Filtra objeto mantendo apenas campos da whitelist
 * @param data - Objeto a ser filtrado
 * @param whitelist - Lista de campos permitidos
 * @returns Objeto filtrado contendo apenas campos permitidos
 */
export function filterByWhitelist<T extends Record<string, any>>(
  data: T,
  whitelist: Whitelist
): Partial<T> {
  const filtered: Partial<T> = {};
  const allowedFields = new Set(whitelist);

  for (const key in data) {
    if (allowedFields.has(key)) {
      filtered[key] = data[key];
    }
  }

  return filtered;
}

/**
 * Remove campos readonly de um objeto
 * @param data - Objeto a ser sanitizado
 * @returns Objeto sem campos readonly
 */
export function removeReadonlyFields<T extends Record<string, any>>(data: T): Partial<T> {
  const sanitized: Partial<T> = { ...data };
  const readonlySet = new Set<string>(READONLY_FIELDS);

  for (const key in sanitized) {
    if (readonlySet.has(key)) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

/**
 * Valida e filtra dados de entrada combinando Zod + whitelist
 * @param data - Dados de entrada
 * @param schema - Schema Zod de validação
 * @param whitelist - Lista de campos permitidos
 * @returns Dados validados e filtrados
 */
export function validateAndFilter<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
  whitelist: Whitelist
): z.infer<T> {
  // 1. Remove campos readonly primeiro
  const withoutReadonly = typeof data === 'object' && data !== null
    ? removeReadonlyFields(data as Record<string, any>)
    : data;

  // 2. Filtra por whitelist
  const filtered = typeof withoutReadonly === 'object' && withoutReadonly !== null
    ? filterByWhitelist(withoutReadonly as Record<string, any>, whitelist)
    : withoutReadonly;

  // 3. Valida com Zod
  return schema.parse(filtered);
}

// ==================== HELPERS ESPECÍFICOS ====================

/**
 * Sanitiza dados de produto para criação
 */
export function sanitizeProductCreate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  return filterByWhitelist(
    removeReadonlyFields(data as Record<string, any>),
    PRODUCT_CREATE_WHITELIST
  );
}

/**
 * Sanitiza dados de produto para atualização
 */
export function sanitizeProductUpdate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  return filterByWhitelist(
    removeReadonlyFields(data as Record<string, any>),
    PRODUCT_UPDATE_WHITELIST
  );
}

/**
 * Sanitiza dados de tenant para auto-atualização
 */
export function sanitizeTenantSelfUpdate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  return filterByWhitelist(
    removeReadonlyFields(data as Record<string, any>),
    TENANT_SELF_UPDATE_WHITELIST
  );
}

/**
 * Sanitiza dados de tenant para atualização admin
 */
export function sanitizeTenantAdminUpdate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  return filterByWhitelist(
    removeReadonlyFields(data as Record<string, any>),
    TENANT_ADMIN_UPDATE_WHITELIST
  );
}

/**
 * Valida se um campo está na whitelist
 */
export function isFieldAllowed(field: string, whitelist: Whitelist): boolean {
  return whitelist.includes(field);
}

/**
 * Detecta tentativa de mass assignment
 * @returns Lista de campos não permitidos que foram enviados
 */
export function detectMassAssignment(
  data: Record<string, any>,
  whitelist: Whitelist
): string[] {
  const allowedFields = new Set(whitelist);
  const readonlySet = new Set<string>(READONLY_FIELDS);
  const suspiciousFields: string[] = [];

  for (const key in data) {
    if (!allowedFields.has(key) || readonlySet.has(key)) {
      suspiciousFields.push(key);
    }
  }

  return suspiciousFields;
}

// ==================== MIDDLEWARE WRAPPER ====================

/**
 * Wrapper para server actions que aplica proteção de mass assignment
 */
export function withMassAssignmentProtection<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  whitelist: Whitelist,
  options: {
    logAttempts?: boolean;
    throwOnDetection?: boolean;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    // Assume que o primeiro argumento é o data object
    const data = args[0];

    if (typeof data === 'object' && data !== null) {
      const suspicious = detectMassAssignment(data as Record<string, any>, whitelist);

      if (suspicious.length > 0) {
        if (options.logAttempts) {
          console.warn('[SECURITY] Mass assignment attempt detected:', {
            suspiciousFields: suspicious,
            handler: handler.name,
          });
        }

        if (options.throwOnDetection) {
          throw new Error('Mass assignment detected: Unauthorized fields in request');
        }

        // Filtra campos suspeitos
        args[0] = filterByWhitelist(data as Record<string, any>, whitelist);
      }
    }

    return handler(...args);
  }) as T;
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Validação e filtragem combinada
import { ProductSchema } from '@/lib/schemas';
import { validateAndFilter, PRODUCT_CREATE_WHITELIST } from '@/lib/security/mass-assignment';

export async function createProduct(data: unknown) {
  const validated = validateAndFilter(
    data,
    ProductSchema,
    PRODUCT_CREATE_WHITELIST
  );
  
  // validated agora contém apenas campos permitidos e validados
  await db.products.insertOne(validated);
}

// Exemplo 2: Detecção de tentativas
const suspicious = detectMassAssignment(req.body, PRODUCT_CREATE_WHITELIST);
if (suspicious.length > 0) {
  console.warn('Mass assignment attempt:', suspicious);
}

// Exemplo 3: Wrapper automático
export const updateProduct = withMassAssignmentProtection(
  async (data: any, productId: string) => {
    // ... lógica
  },
  PRODUCT_UPDATE_WHITELIST,
  { logAttempts: true, throwOnDetection: false }
);
*/

