'use server';

import clientPromise from '@/lib/mongodb';
import { KrovSettingsSchema, SaasPlanSchema } from '@/lib/schemas';
import type { KrovSettings, SaasPlan } from '@/lib/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// --- General ---
type ActionResult = {
  success: boolean;
  message: string;
};

// --- Helper Functions ---

/**
 * Mascara credenciais sensíveis mostrando apenas os primeiros caracteres
 */
function maskCredential(value?: string): string {
  if (!value || value.length === 0) return '';
  if (value.length <= 10) return '•'.repeat(8);
  
  // Mostra os primeiros 12 caracteres e mascara o resto
  const visiblePart = value.substring(0, 12);
  const maskedPart = '•'.repeat(Math.min(value.length - 12, 40));
  return visiblePart + maskedPart;
}


// --- Settings Actions ---
const SETTINGS_ID = 'global';

export async function getSettings(): Promise<KrovSettings> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const settingsCollection = db.collection('settings');
    const settings = await settingsCollection.findOne({ _id: SETTINGS_ID as any });

    if (!settings) {
      return { paymentIntegrations: { mercadopago: { mode: 'sandbox' } } };
    }

    // Mascara credenciais sensíveis antes de enviar ao frontend
    const mpSettings = settings.paymentIntegrations?.mercadopago;
    const maskedMpSettings = mpSettings ? {
      mode: mpSettings.mode,
      sandbox_public_key: maskCredential(mpSettings.sandbox_public_key),
      sandbox_access_token: maskCredential(mpSettings.sandbox_access_token),
      production_public_key: maskCredential(mpSettings.production_public_key),
      production_access_token: maskCredential(mpSettings.production_access_token),
      // Suporta tanto webhook_secret (novo) quanto sandbox_webhook_secret (antigo) para compatibilidade
      webhook_secret: maskCredential(mpSettings.webhook_secret || (mpSettings as any).sandbox_webhook_secret),
      success_url: mpSettings.success_url,
      failure_url: mpSettings.failure_url,
      pending_url: mpSettings.pending_url,
    } : { mode: 'sandbox' as const };

    const typedSettings: KrovSettings = {
      paymentIntegrations: {
        mercadopago: maskedMpSettings,
      },
    };

    return typedSettings;

  } catch (error) {
    console.error('Failed to get settings:', error);
    return { paymentIntegrations: { mercadopago: { mode: 'sandbox' } } };
  }
}

/**
 * Valida a senha do admin antes de permitir edição de credenciais
 * Busca qualquer admin e valida a senha
 */
export async function validateAdminPassword(password: string): Promise<ActionResult> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const adminCollection = db.collection('admins');

    // Busca todos os admins
    const admins = await adminCollection.find({}).toArray();

    if (!admins || admins.length === 0) {
      return { success: false, message: 'Nenhum administrador encontrado.' };
    }

    // Tenta validar a senha com qualquer admin
    for (const admin of admins) {
      if (admin.password) {
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (isPasswordValid) {
          return { success: true, message: 'Senha validada com sucesso.' };
        }
      }
    }

    return { success: false, message: 'Senha incorreta.' };

  } catch (error) {
    console.error('Error validating admin password:', error);
    return { success: false, message: 'Erro ao validar senha.' };
  }
}

/**
 * Retorna as configurações não mascaradas após validar a senha
 */
export async function getUnmaskedSettings(password: string): Promise<{ success: boolean; data?: KrovSettings; message: string }> {
  try {
    // Primeiro valida a senha
    const passwordValidation = await validateAdminPassword(password);
    
    if (!passwordValidation.success) {
      return { success: false, message: passwordValidation.message };
    }

    // Se a senha estiver correta, retorna as configurações não mascaradas
    const client = await clientPromise;
    const db = client.db('vematize');
    const settingsCollection = db.collection('settings');
    const settings = await settingsCollection.findOne({ _id: SETTINGS_ID as any });

    if (!settings) {
      return { 
        success: true, 
        data: { paymentIntegrations: { mercadopago: { mode: 'sandbox' } } },
        message: 'Configurações carregadas com sucesso.'
      };
    }

    // Retorna as credenciais SEM mascarar
    const mpSettings = settings.paymentIntegrations?.mercadopago;
    const unmaskedMpSettings = mpSettings ? {
      ...mpSettings,
      // Suporta tanto webhook_secret (novo) quanto sandbox_webhook_secret (antigo) para compatibilidade
      webhook_secret: mpSettings.webhook_secret || (mpSettings as any).sandbox_webhook_secret || '',
    } : { mode: 'sandbox' as const };
    
    const typedSettings: KrovSettings = {
      paymentIntegrations: {
        mercadopago: unmaskedMpSettings,
      },
    };

    return { success: true, data: typedSettings, message: 'Configurações carregadas com sucesso.' };

  } catch (error) {
    console.error('Error getting unmasked settings:', error);
    return { success: false, message: 'Erro ao carregar configurações.' };
  }
}

export async function updateSettings(
  values: KrovSettings
): Promise<ActionResult> {
  try {
    const validatedData = KrovSettingsSchema.parse(values);
    
    const client = await clientPromise;
    const db = client.db('vematize');
    const settingsCollection = db.collection('settings');
    
    // Busca configurações existentes para fazer merge
    const existingSettings = await settingsCollection.findOne({ _id: SETTINGS_ID as any });
    const existingMp = existingSettings?.paymentIntegrations?.mercadopago || {};
    const newMp = validatedData.paymentIntegrations?.mercadopago || {};
    
    // Faz merge: mantém o valor antigo se o novo for vazio/undefined
    const mergedMp = {
      mode: (newMp as any).mode || (existingMp as any).mode || 'sandbox',
      sandbox_public_key: (newMp as any).sandbox_public_key || (existingMp as any).sandbox_public_key,
      sandbox_access_token: (newMp as any).sandbox_access_token || (existingMp as any).sandbox_access_token,
      sandbox_webhook_secret: (newMp as any).sandbox_webhook_secret || (existingMp as any).sandbox_webhook_secret,
      production_public_key: (newMp as any).production_public_key || (existingMp as any).production_public_key,
      production_access_token: (newMp as any).production_access_token || (existingMp as any).production_access_token,
      production_webhook_secret: (newMp as any).production_webhook_secret || (existingMp as any).production_webhook_secret,
      success_url: (newMp as any).success_url !== undefined ? (newMp as any).success_url : (existingMp as any).success_url,
      failure_url: (newMp as any).failure_url !== undefined ? (newMp as any).failure_url : (existingMp as any).failure_url,
      pending_url: (newMp as any).pending_url !== undefined ? (newMp as any).pending_url : (existingMp as any).pending_url,
    };
    
    const mergedData = {
      ...validatedData,
      paymentIntegrations: {
        ...validatedData.paymentIntegrations,
        mercadopago: mergedMp,
      },
    };
    
    await settingsCollection.updateOne(
      { _id: SETTINGS_ID as any },
      { $set: mergedData },
      { upsert: true }
    );
    
    revalidatePath('/krov/settings');
    return { success: true, message: 'Configurações salvas com sucesso!' };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Failed to update settings:', error);
    return { success: false, message: 'Ocorreu um erro inesperado.' };
  }
}

// --- SaaS Plan Actions ---

type SaasPlanDocument = {
  _id: ObjectId;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

export async function getSaasPlans(): Promise<SaasPlan[]> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const plansCollection = db.collection<SaasPlanDocument>('plans');
    
    const plans = await plansCollection.find({}).sort({ price: 1 }).toArray();

    return plans.map((plan) => ({
      id: plan._id.toString(),
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      features: plan.features || [],
      isActive: plan.isActive,
    }));
  } catch (error) {
    console.error('Database error fetching saas plans:', error);
    return [];
  }
}

export async function getActiveSaasPlans(): Promise<SaasPlan[]> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const plansCollection = db.collection<SaasPlanDocument>('plans');
    
    const plans = await plansCollection.find({ isActive: true }).sort({ price: 1 }).toArray();

    return plans.map((plan) => ({
      id: plan._id.toString(),
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      features: plan.features || [],
      isActive: plan.isActive,
    }));
  } catch (error) {
    console.error('Database error fetching active saas plans:', error);
    return [];
  }
}

export async function saveSaasPlan(formData: FormData): Promise<ActionResult> {
  try {
    // Parse FormData corretamente (arrays precisam de getAll)
    const rawData = Object.fromEntries(formData);
    const features = formData.getAll('features') as string[]; // Pega array de features
    const isActive = formData.get('isActive') === 'true'; // Converte string para boolean
    
    const validatedData = SaasPlanSchema.parse({
      ...rawData,
      features, // Sobrescreve com array correto
      isActive, // Sobrescreve com boolean correto
      price: rawData.price ? Number(rawData.price) : undefined,
      durationDays: rawData.durationDays ? Number(rawData.durationDays) : undefined,
    });
    const { id, ...planData } = validatedData;

    const client = await clientPromise;
    const db = client.db('vematize');
    const plansCollection = db.collection<SaasPlanDocument>('plans');

    if (id) {
      // Update existing plan
      const result = await plansCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: {
          name: planData.name,
          price: planData.price,
          durationDays: planData.durationDays,
          features: planData.features,
          isActive: planData.isActive
        } }
      );

      if (!result.matchedCount) {
        throw new Error('Plano não encontrado.');
      }
    } else {
      // Create new plan
      await plansCollection.insertOne({
        name: planData.name,
        price: planData.price,
        durationDays: planData.durationDays,
        features: planData.features,
        isActive: planData.isActive
      } as SaasPlanDocument);
    }

    revalidatePath('/krov/settings');
    return { success: true, message: 'Plano salvo com sucesso!' };
  } catch (error) {
    console.error('Error saving saas plan:', error);
    const message = error instanceof Error ? error.message : 'Erro ao salvar o plano.';
    return { success: false, message };
  }
}

export async function deleteSaasPlan(id: string): Promise<ActionResult> {
  try {
    if (!id) {
        return { success: false, message: 'ID do plano não fornecido.' };
    }
    const client = await clientPromise;
    const db = client.db('vematize');
    const plansCollection = db.collection('plans');
    
    const result = await plansCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
        return { success: false, message: 'Plano não encontrado.' };
    }

    revalidatePath('/krov/settings');
    return { success: true, message: 'Plano excluído com sucesso!' };

  } catch (error) {
    console.error('Failed to delete saas plan:', error);
    return { success: false, message: 'Ocorreu um erro inesperado ao excluir o plano.' };
  }
}
