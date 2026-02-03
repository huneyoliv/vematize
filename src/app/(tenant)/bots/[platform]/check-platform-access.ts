/**
 * 🔒 Verificação de acesso a plataforma
 * 
 * Garante que o tenant só pode acessar páginas de bots para plataformas
 * incluídas no seu plano SaaS
 */

import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Platform } from '../platform-config';

export async function checkPlatformAccess(platform: Platform): Promise<{
  hasAccess: boolean;
  planName?: string;
  allowedPlatforms?: string[];
}> {
  try {
    const tenant = await getTenantFromSession();
    
    // Se não tiver planId, permite acesso (fallback - trial ou sem plano)
    if (!tenant.planId) {
      return { hasAccess: true };
    }

    const client = await clientPromise;
    const db = client.db('vematize');
    const plansCollection = db.collection('plans');
    
    const plan = await plansCollection.findOne({ _id: new ObjectId(tenant.planId) });
    
    // Se plano não encontrado, permite acesso (fallback)
    if (!plan) {
      return { hasAccess: true };
    }

    // Se plano não tem restrições de plataforma, permite tudo
    if (!plan.allowedPlatforms || plan.allowedPlatforms.length === 0) {
      return { hasAccess: true, planName: plan.name };
    }

    // Verifica se a plataforma está na lista de permitidas
    const hasAccess = plan.allowedPlatforms.includes(platform);

    return {
      hasAccess,
      planName: plan.name,
      allowedPlatforms: plan.allowedPlatforms
    };
  } catch (error) {
    console.error(`[Platform Access] Error checking access for ${platform}:`, error);
    // Em caso de erro, nega acesso por segurança
    return { hasAccess: false };
  }
}




