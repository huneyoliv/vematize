/**
 * Utilitários para validação de assinatura
 */

import type { Tenant } from '../types';

/**
 * Verifica se o tenant tem uma assinatura válida
 * @param tenant - Tenant a ser verificado
 * @returns true se a assinatura é válida, false caso contrário
 */
export function hasValidSubscription(tenant: Tenant): boolean {
  const now = new Date();

  // Se está explicitamente inativo, bloqueia
  if (tenant.subscriptionStatus === 'inactive') {
    console.log(`[Subscription] Tenant ${tenant._id} está inativo`);
    return false;
  }

  // Se está em trial, verifica se expirou
  if (tenant.subscriptionStatus === 'trialing') {
    if (!tenant.trialEndsAt) {
      console.warn(`[Subscription] Tenant ${tenant._id} está em trial mas não tem trialEndsAt`);
      return false;
    }

    const trialEnd = new Date(tenant.trialEndsAt);

    if (now > trialEnd) {
      console.warn(`[Subscription] Tenant ${tenant._id} trial expirou em ${trialEnd.toISOString()}`);
      return false;
    }

    console.log(`[Subscription] Tenant ${tenant._id} trial válido até ${trialEnd.toISOString()}`);
    return true;
  }

  // Se está ativo com subscription, verifica se expirou
  if (tenant.subscriptionStatus === 'active') {
    if (!tenant.subscriptionEndsAt) {
      // Ativo sem data de expiração = válido (assinatura vitalícia/admin)
      console.log(`[Subscription] Tenant ${tenant._id} ativo sem expiração`);
      return true;
    }

    const subscriptionEnd = new Date(tenant.subscriptionEndsAt);

    if (now > subscriptionEnd) {
      console.warn(`[Subscription] Tenant ${tenant._id} assinatura expirou em ${subscriptionEnd.toISOString()}`);
      return false;
    }

    console.log(`[Subscription] Tenant ${tenant._id} assinatura válida até ${subscriptionEnd.toISOString()}`);
    return true;
  }

  // Status desconhecido, bloqueia por segurança
  console.warn(`[Subscription] Tenant ${tenant._id} tem status desconhecido: ${tenant.subscriptionStatus}`);
  return false;
}

/**
 * Retorna a mensagem apropriada para assinatura expirada
 * @param tenant - Tenant
 * @returns Mensagem de assinatura expirada
 */
export function getExpiredSubscriptionMessage(tenant: Tenant): string {
  const customMessage = tenant.botConfig?.inactiveSubscriptionMessage;

  if (customMessage) {
    return customMessage;
  }

  if (tenant.subscriptionStatus === 'trialing') {
    return '⚠️ Seu período de teste gratuito expirou. Para continuar usando o serviço, por favor, assine um plano.';
  }

  return '⚠️ Sua assinatura expirou. Por favor, renove para continuar usando o serviço.';
}

/**
 * Retorna informações sobre o status da assinatura
 * @param tenant - Tenant
 * @returns Informações sobre a assinatura
 */
export function getSubscriptionInfo(tenant: Tenant): {
  isValid: boolean;
  status: string;
  expiresAt?: Date;
  daysRemaining?: number;
} {
  const now = new Date();
  const isValid = hasValidSubscription(tenant);

  let expiresAt: Date | undefined;
  let daysRemaining: number | undefined;

  if (tenant.subscriptionStatus === 'trialing' && tenant.trialEndsAt) {
    expiresAt = new Date(tenant.trialEndsAt);
    daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else if (tenant.subscriptionStatus === 'active' && tenant.subscriptionEndsAt) {
    expiresAt = new Date(tenant.subscriptionEndsAt);
    daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    isValid,
    status: tenant.subscriptionStatus || 'unknown',
    expiresAt,
    daysRemaining: daysRemaining && daysRemaining > 0 ? daysRemaining : undefined
  };
}
