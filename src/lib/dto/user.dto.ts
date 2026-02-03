/**
 * Data Transfer Objects (DTOs)
 * 
 * DTOs controlam EXATAMENTE quais campos são expostos ao cliente,
 * prevenindo Excessive Data Exposure e vazamento de informações sensíveis.
 * 
 * NUNCA retorne documentos completos do banco de dados!
 */

import type { ObjectId } from 'mongodb';

// ==================== USER DTOS ====================

export type SafeUserDTO = {
  id: string;
  name: string;
  email: string;
  type: 'admin' | 'tenant';
  subdomain?: string;
  createdAt?: string;
};

/**
 * Converte um documento de usuário admin em DTO seguro
 * Remove: password, internal fields, etc.
 */
export function toSafeAdminDTO(admin: any): SafeUserDTO {
  return {
    id: admin._id?.toString() || admin.id,
    name: admin.username,
    email: admin.email || admin.username,
    type: 'admin',
    createdAt: admin.createdAt?.toISOString?.() || admin.createdAt,
  };
}

/**
 * Converte um documento de tenant em DTO seguro
 * Remove: passwordHash, payment details, tokens, etc.
 */
export function toSafeTenantDTO(tenant: any): SafeUserDTO {
  return {
    id: tenant._id?.toString() || tenant.id,
    name: tenant.ownerName || 'Cliente',
    email: tenant.ownerEmail,
    type: 'tenant',
    subdomain: tenant.subdomain || tenant.username,
    createdAt: tenant.createdAt?.toISOString?.() || tenant.createdAt,
  };
}

// ==================== TENANT DTOS ====================

export type SafeTenantDTO = {
  id: string;
  ownerName: string;
  ownerEmail: string;
  subdomain: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  currentPlan?: string;
  createdAt?: string;
  // Campos seguros de configuração
  hasDiscordBot?: boolean;
  hasTelegramBot?: boolean;
  hasPaymentGateway?: boolean;
};

/**
 * Converte tenant completo em DTO seguro para listagem
 */
export function toSafeTenantListDTO(tenant: any): SafeTenantDTO {
  return {
    id: tenant._id?.toString() || tenant.id,
    ownerName: tenant.ownerName || 'Cliente',
    ownerEmail: tenant.ownerEmail,
    subdomain: tenant.subdomain || tenant.username,
    subscriptionStatus: tenant.subscriptionStatus || 'inactive',
    trialEndsAt: tenant.trialEndsAt,
    subscriptionEndsAt: tenant.subscriptionEndsAt,
    currentPlan: tenant.currentPlan,
    createdAt: tenant.createdAt?.toISOString?.() || tenant.createdAt,
    hasDiscordBot: !!tenant.connections?.discord?.botToken,
    hasTelegramBot: !!tenant.connections?.telegram?.botToken,
    hasPaymentGateway: !!(
      tenant.paymentIntegrations?.mercadopago ||
      tenant.paymentIntegrations?.stripe ||
      tenant.paymentIntegrations?.pushinpay
    ),
  };
}

// ==================== PRODUCT DTOS ====================

export type SafeProductDTO = {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  type: 'product' | 'subscription';
  isActive?: boolean;
  stock?: number | null;
  // NÃO expor: activationCodes completos, hostedFileUrl direto, etc.
  hasStock?: boolean;
  hasActivationCodes?: boolean;
};

/**
 * Converte produto em DTO seguro para listagem pública
 */
export function toSafeProductDTO(product: any): SafeProductDTO {
  return {
    id: product._id?.toString() || product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice,
    type: product.type || 'product',
    isActive: product.isActive,
    stock: product.stock,
    // Booleanos ao invés de dados sensíveis
    hasStock: (product.stock ?? 0) > 0,
    hasActivationCodes: !!product.activationCodes,
  };
}

// ==================== SESSION DTOS ====================

export type SessionDTO = {
  userId: string;
  email: string;
  name: string;
  type: 'admin' | 'tenant';
  subdomain?: string;
  expiresAt: string;
};

/**
 * Converte sessão interna em DTO para o cliente
 */
export function toSessionDTO(session: any): SessionDTO {
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    type: session.type,
    subdomain: session.subdomain,
    expiresAt: session.expiresAt?.toISOString?.() || session.expiresAt,
  };
}

// ==================== BOT CONFIG DTOS ====================

export type SafeBotConfigDTO = {
  platform: string;
  isConfigured: boolean;
  botUsername?: string;
  // NÃO expor: tokens, secrets, api keys
};

/**
 * Converte configuração de bot em DTO seguro
 */
export function toSafeBotConfigDTO(platform: string, connection: any): SafeBotConfigDTO {
  if (!connection) {
    return {
      platform,
      isConfigured: false,
    };
  }

  return {
    platform,
    isConfigured: true,
    botUsername: connection.botUsername || connection.username,
    // Tokens e secrets NUNCA são expostos
  };
}

