/**
 * 🔒 Utilitário para verificar acesso a plataformas baseado no plano do tenant
 * 
 * Cada plano SaaS pode ter acesso restrito a plataformas específicas:
 * - Plano Telegram: Apenas telegram
 * - Plano Discord: Apenas discord
 * - Plano Master: Todas as plataformas (telegram, discord, whatsapp, instagram)
 */

import type { Tenant, SaasPlan } from '../types';

export type Platform = 'telegram' | 'discord' | 'whatsapp' | 'instagram';

/**
 * Verifica se o tenant tem permissão para acessar uma plataforma específica
 * 
 * @param tenant - O tenant que está tentando acessar
 * @param platform - A plataforma a ser verificada
 * @param currentPlan - O plano SaaS do tenant (opcional, será buscado se não fornecido)
 * @returns true se o tenant pode acessar a plataforma
 */
export function hasPlatformAccess(
  tenant: Tenant | null,
  platform: Platform,
  currentPlan?: SaasPlan | null
): boolean {
  if (!tenant) return false;

  // Se não tiver plano ou plano não tiver restrições, permite tudo (fallback)
  if (!currentPlan || !currentPlan.allowedPlatforms || currentPlan.allowedPlatforms.length === 0) {
    return true;
  }

  // Verifica se a plataforma está na lista de permitidas
  return currentPlan.allowedPlatforms.includes(platform);
}

/**
 * Retorna todas as plataformas que o tenant tem acesso
 * 
 * @param tenant - O tenant
 * @param currentPlan - O plano SaaS do tenant
 * @returns Array de plataformas permitidas
 */
export function getAllowedPlatforms(
  tenant: Tenant | null,
  currentPlan?: SaasPlan | null
): Platform[] {
  if (!tenant) return [];

  // Se não tiver plano ou plano não tiver restrições, permite todas
  if (!currentPlan || !currentPlan.allowedPlatforms || currentPlan.allowedPlatforms.length === 0) {
    return ['telegram', 'discord', 'whatsapp', 'instagram'];
  }

  return currentPlan.allowedPlatforms as Platform[];
}

/**
 * Retorna um objeto com status de acesso para cada plataforma
 * 
 * @param tenant - O tenant
 * @param currentPlan - O plano SaaS do tenant
 * @returns Objeto com status de acesso por plataforma
 */
export function getPlatformAccessMap(
  tenant: Tenant | null,
  currentPlan?: SaasPlan | null
): Record<Platform, boolean> {
  const allowedPlatforms = getAllowedPlatforms(tenant, currentPlan);

  return {
    telegram: allowedPlatforms.includes('telegram'),
    discord: allowedPlatforms.includes('discord'),
    whatsapp: allowedPlatforms.includes('whatsapp'),
    instagram: allowedPlatforms.includes('instagram'),
  };
}

/**
 * Retorna um texto descritivo sobre quais plataformas o tenant tem acesso
 * 
 * @param tenant - O tenant
 * @param currentPlan - O plano SaaS do tenant
 * @returns String descritiva
 */
export function getPlatformAccessDescription(
  tenant: Tenant | null,
  currentPlan?: SaasPlan | null
): string {
  const allowedPlatforms = getAllowedPlatforms(tenant, currentPlan);

  if (allowedPlatforms.length === 0) {
    return 'Nenhuma plataforma disponível';
  }

  if (allowedPlatforms.length === 4) {
    return 'Todas as plataformas';
  }

  const platformNames: Record<Platform, string> = {
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
  };

  const names = allowedPlatforms.map(p => platformNames[p]);
  
  if (names.length === 1) {
    return `Apenas ${names[0]}`;
  }

  if (names.length === 2) {
    return `${names[0]} e ${names[1]}`;
  }

  const last = names.pop();
  return `${names.join(', ')} e ${last}`;
}




