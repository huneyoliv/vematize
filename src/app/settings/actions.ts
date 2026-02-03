'use server';

import clientPromise from '@/lib/mongodb';
import { getCurrentSession } from '@/lib/auth';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import {
    MercadoPagoSettingsSchema,
    PushinPaySettingsSchema,
    StripeSettingsSchema,
    EfiSettingsSchema,
    KrovSettingsSchema,
    SaasPlanSchema
} from '@/lib/schemas';
import type {
    KrovSettings,
    SaasPlan,
    LegalDocument,
    User
} from '@/lib/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { sendLegalUpdateEmail } from '@/lib/email';

export async function getBotServiceUrlAction() {
    return process.env.BOT_SERVICE_URL || null;
}

export async function getLegalDocument(type: 'terms_of_service' | 'privacy_policy') {
    const db = (await clientPromise).db('vematize');
    const doc = await db.collection<LegalDocument>('legal_documents').findOne({ type });

    if (!doc) return null;

    return {
        ...doc,
        _id: doc._id.toString(),
        effectiveDate: doc.effectiveDate.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export async function saveLegalDocument(type: 'terms_of_service' | 'privacy_policy', content: string) {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const db = (await clientPromise).db('vematize');
    const collection = db.collection<LegalDocument>('legal_documents');

    // Effective date is 15 days from now
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + 15);

    await collection.updateOne(
        { type },
        {
            $set: {
                content,
                effectiveDate,
                updatedAt: new Date(),
            },
            $setOnInsert: {
                createdAt: new Date(),
                version: 1, // Keep version 1 for compatibility if needed
            }
        },
        { upsert: true }
    );

    // Notify users
    // Fetch all active users emails
    const users = await db.collection<User>('users').find({ state: 'active' }, { projection: { email: 1 } }).toArray();
    const emails = users.map(u => u.email).filter(Boolean) as string[];

    // Also notify tenants
    const tenants = await db.collection('tenants').find({}, { projection: { ownerEmail: 1 } }).toArray();
    const tenantEmails = tenants.map(t => t.ownerEmail).filter(Boolean) as string[];

    const allEmails = [...new Set([...emails, ...tenantEmails])];

    if (allEmails.length > 0) {
        // Fire and forget email sending to not block response
        sendLegalUpdateEmail(allEmails, type, effectiveDate).catch(err => console.error('Failed to send legal update emails', err));
    }

    revalidatePath('/terms');
    revalidatePath('/privacy');

    return { success: true, message: 'Documento salvo e usuários notificados.' };
}

import bcrypt from 'bcryptjs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// --- Types ---
export type MercadoPagoSettings = z.infer<typeof MercadoPagoSettingsSchema>;
export type PushinPaySettings = z.infer<typeof PushinPaySettingsSchema>;
export type StripeSettings = z.infer<typeof StripeSettingsSchema>;
export type EfiSettings = z.infer<typeof EfiSettingsSchema>;

type ActionResult = {
    success: boolean;
    message: string;
};

type SaasPlanDocument = {
    _id: ObjectId;
    name: string;
    price: number;
    durationDays: number;
    features: string[];
    isActive: boolean;
    efiPlanId?: string;
}

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

// --- Global Settings Actions (Admin) ---
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
                efi: settings.paymentIntegrations?.efi ? {
                    mode: settings.paymentIntegrations.efi.mode,
                    sandbox_client_id: maskCredential(settings.paymentIntegrations.efi.sandbox_client_id),
                    sandbox_client_secret: maskCredential(settings.paymentIntegrations.efi.sandbox_client_secret),
                    production_client_id: maskCredential(settings.paymentIntegrations.efi.production_client_id),
                    production_client_secret: maskCredential(settings.paymentIntegrations.efi.production_client_secret),
                    pix_key: settings.paymentIntegrations.efi.pix_key,
                    certificate: settings.paymentIntegrations.efi.certificate ? 'Certificado configurado' : undefined,
                } : { mode: 'sandbox' },
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
                efi: settings.paymentIntegrations?.efi || { mode: 'sandbox' },
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

        // Faz merge: mantém o valor antigo se o novo for vazio/undefined OU se estiver mascarado
        const isMasked = (value?: string) => value && value.includes('•');

        const mergedMp = {
            mode: (newMp as any).mode || (existingMp as any).mode || 'sandbox',
            sandbox_public_key: isMasked((newMp as any).sandbox_public_key) ? (existingMp as any).sandbox_public_key : ((newMp as any).sandbox_public_key || (existingMp as any).sandbox_public_key),
            sandbox_access_token: isMasked((newMp as any).sandbox_access_token) ? (existingMp as any).sandbox_access_token : ((newMp as any).sandbox_access_token || (existingMp as any).sandbox_access_token),
            sandbox_webhook_secret: isMasked((newMp as any).sandbox_webhook_secret) ? (existingMp as any).sandbox_webhook_secret : ((newMp as any).sandbox_webhook_secret || (existingMp as any).sandbox_webhook_secret),
            production_public_key: isMasked((newMp as any).production_public_key) ? (existingMp as any).production_public_key : ((newMp as any).production_public_key || (existingMp as any).production_public_key),
            production_access_token: isMasked((newMp as any).production_access_token) ? (existingMp as any).production_access_token : ((newMp as any).production_access_token || (existingMp as any).production_access_token),
            production_webhook_secret: isMasked((newMp as any).production_webhook_secret) ? (existingMp as any).production_webhook_secret : ((newMp as any).production_webhook_secret || (existingMp as any).production_webhook_secret),
            success_url: (newMp as any).success_url !== undefined ? (newMp as any).success_url : (existingMp as any).success_url,
            failure_url: (newMp as any).failure_url !== undefined ? (newMp as any).failure_url : (existingMp as any).failure_url,
            pending_url: (newMp as any).pending_url !== undefined ? (newMp as any).pending_url : (existingMp as any).pending_url,
        };

        const mergedData = {
            ...validatedData,
            paymentIntegrations: {
                ...validatedData.paymentIntegrations,
                mercadopago: mergedMp,
                efi: {
                    ...validatedData.paymentIntegrations?.efi,
                    // Se a senha não for reenviada (estiver mascarada ou vazia), mantém a antiga
                    sandbox_client_id: validatedData.paymentIntegrations?.efi?.sandbox_client_id?.includes('•') ? existingSettings?.paymentIntegrations?.efi?.sandbox_client_id : validatedData.paymentIntegrations?.efi?.sandbox_client_id,
                    sandbox_client_secret: validatedData.paymentIntegrations?.efi?.sandbox_client_secret?.includes('•') ? existingSettings?.paymentIntegrations?.efi?.sandbox_client_secret : validatedData.paymentIntegrations?.efi?.sandbox_client_secret,
                    production_client_id: validatedData.paymentIntegrations?.efi?.production_client_id?.includes('•') ? existingSettings?.paymentIntegrations?.efi?.production_client_id : validatedData.paymentIntegrations?.efi?.production_client_id,
                    production_client_secret: validatedData.paymentIntegrations?.efi?.production_client_secret?.includes('•') ? existingSettings?.paymentIntegrations?.efi?.production_client_secret : validatedData.paymentIntegrations?.efi?.production_client_secret,
                    // Se o certificado for a string de exibição, mantém o caminho original
                    certificate: validatedData.paymentIntegrations?.efi?.certificate === 'Certificado configurado' ? existingSettings?.paymentIntegrations?.efi?.certificate : validatedData.paymentIntegrations?.efi?.certificate,
                    pix_key: validatedData.paymentIntegrations?.efi?.pix_key,
                }
            },
            logoUrl: validatedData.logoUrl !== undefined ? validatedData.logoUrl : (existingSettings as any)?.logoUrl,
            preferredPixGateway: validatedData.preferredPixGateway !== undefined ? validatedData.preferredPixGateway : (existingSettings as any)?.preferredPixGateway,
            preferredCardGateway: validatedData.preferredCardGateway !== undefined ? validatedData.preferredCardGateway : (existingSettings as any)?.preferredCardGateway,
        };

        await settingsCollection.updateOne(
            { _id: SETTINGS_ID as any },
            { $set: mergedData },
            { upsert: true }
        );

        revalidatePath('/settings');
        return { success: true, message: 'Configurações salvas com sucesso!' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Failed to update settings:', error);
        return { success: false, message: 'Ocorreu um erro inesperado.' };
    }
}

export async function removePaymentIntegration(
    provider: 'efi' | 'mercadopago' | 'stripe' | 'pushinpay'
): Promise<ActionResult> {
    try {
        const session = await getCurrentSession();
        if (!session || session.type !== 'admin') {
            return { success: false, message: 'Acesso não autorizado.' };
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const settingsCollection = db.collection('settings');

        const updateField = `paymentIntegrations.${provider}`;

        const result = await settingsCollection.updateOne(
            { _id: SETTINGS_ID as any },
            { $unset: { [updateField]: "" } }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: 'Configuração não encontrada ou já removida.' };
        }

        revalidatePath('/settings');
        return { success: true, message: 'Configuração removida com sucesso!' };

    } catch (error) {
        console.error(`Failed to remove ${provider} integration:`, error);
        return { success: false, message: 'Erro ao remover configuração.' };
    }
}

export async function uploadLogo(formData: FormData): Promise<{ success: boolean; url?: string; message: string }> {
    try {
        const file = formData.get('file') as File;

        if (!file) {
            return { success: false, message: 'Nenhum arquivo enviado.' };
        }

        // Validação de tipo
        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            return { success: false, message: 'Apenas arquivos JPG e PNG são permitidos.' };
        }

        // Validação de tamanho (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return { success: false, message: 'O arquivo deve ter no máximo 2MB.' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Cria diretório se não existir
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        await mkdir(uploadDir, { recursive: true });

        // Nome único para o arquivo
        const filename = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.name)}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        const url = `/uploads/logos/${filename}`;
        return { success: true, url, message: 'Logo enviado com sucesso!' };

    } catch (error) {
        console.error('Error uploading logo:', error);
        return { success: false, message: 'Erro ao fazer upload do logo.' };
    }
}

export async function uploadCertificate(formData: FormData): Promise<{ success: boolean; path?: string; message: string }> {
    try {
        const file = formData.get('file') as File;

        if (!file) {
            return { success: false, message: 'Nenhum arquivo enviado.' };
        }

        // Validação de tipo (p12)
        if (!file.name.endsWith('.p12')) {
            return { success: false, message: 'Apenas arquivos .p12 são permitidos.' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Cria diretório privado se não existir
        // Usar um diretório fora de public para segurança
        const certsDir = path.join(process.cwd(), 'private', 'certs');
        await mkdir(certsDir, { recursive: true });

        // Nome único para o arquivo
        const filename = `cert-${Date.now()}-${Math.random().toString(36).substring(7)}.p12`;
        const filepath = path.join(certsDir, filename);

        await writeFile(filepath, buffer);

        return { success: true, path: filepath, message: 'Certificado enviado com sucesso!' };

    } catch (error) {
        console.error('Error uploading certificate:', error);
        return { success: false, message: 'Erro ao fazer upload do certificado.' };
    }
}

// --- SaaS Plan Actions ---

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

export interface LandingPagePlan {
    id: string;
    name: string;
    price: number;
    yearlyPrice: number;
    period: string;
    features: string[];
    description: string;
    buttonText: string;
    href: string;
    isPopular: boolean;
}

export async function getLandingPagePlans(): Promise<LandingPagePlan[]> {
    try {
        const plans = await getActiveSaasPlans();

        return plans.map((plan, index) => ({
            id: plan.id!,
            name: plan.name,
            price: plan.price,
            yearlyPrice: Math.round(plan.price * 0.8), // Logic moved from frontend
            period: plan.durationDays % 30 === 0 && plan.durationDays > 0
                ? (plan.durationDays / 30 === 1 ? 'mês' : `${plan.durationDays / 30} meses`)
                : `${plan.durationDays} dias`,
            features: plan.features,
            description: 'Ideal para equipes que desejam escalar', // Could be moved to DB later
            buttonText: 'Iniciar Teste Gratuito',
            href: '/register',
            isPopular: index === 1 && plans.length === 3, // Logic moved from frontend
        }));
    } catch (error) {
        console.error('Error fetching landing page plans:', error);
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

        // Create in Efí if configured and not present
        // Create in Efí if configured and not present
        const settings = await getSettings();
        if (settings.paymentIntegrations?.efi?.mode && !planData.efiPlanId) {
            try {
                const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:3001';
                // Calculate interval in months (approximate)
                const interval = Math.max(1, Math.round(planData.durationDays / 30));

                const response = await fetch(`${botServiceUrl}/api/v1/efi/plans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenantId: 'global',
                        name: planData.name,
                        interval: interval,
                        price: Math.round(planData.price * 100) // Cents
                    })
                });

                if (response.ok) {
                    const efiData = await response.json();
                    // Efí returns data.data.plan_id usually
                    const planId = efiData.data?.plan_id || efiData.plan_id;
                    if (planId) {
                        planData.efiPlanId = planId.toString();
                    }
                } else {
                    console.error('Failed to create Efí plan:', await response.text());
                }
            } catch (e) {
                console.error('Error calling bot-service for Efí plan:', e);
            }
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const plansCollection = db.collection<SaasPlanDocument>('plans');

        if (id) {
            // Update existing plan
            const result = await plansCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        name: planData.name,
                        price: planData.price,
                        durationDays: planData.durationDays,
                        features: planData.features,
                        isActive: planData.isActive,
                        efiPlanId: planData.efiPlanId
                    }
                }
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
                isActive: planData.isActive,
                efiPlanId: planData.efiPlanId
            } as SaasPlanDocument);
        }

        revalidatePath('/settings');
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

        revalidatePath('/settings');
        return { success: true, message: 'Plano excluído com sucesso!' };

    } catch (error) {
        console.error('Failed to delete saas plan:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao excluir o plano.' };
    }
}

// --- Tenant Settings Actions ---

/**
 * Obtém as configurações do Mercado Pago do tenant logado
 */
export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings | null> {
    try {
        const tenant = await getTenantFromSession();

        if (!tenant.paymentIntegrations?.mercadopago) {
            return null;
        }

        const mpSettings = tenant.paymentIntegrations.mercadopago;

        // Mask sensitive data
        return {
            ...mpSettings,
            sandbox_access_token: maskCredential(mpSettings.sandbox_access_token),
            production_access_token: maskCredential(mpSettings.production_access_token),
            webhook_secret: maskCredential(mpSettings.webhook_secret),
        };
    } catch (error) {
        console.error('Erro ao buscar configurações do Mercado Pago:', error);
        throw error;
    }
}

/**
 * Atualiza as configurações do Mercado Pago do tenant logado
 */
export async function updateMercadoPagoSettings(
    data: MercadoPagoSettings
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();

        // Valida os dados
        const validatedData = MercadoPagoSettingsSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const result = await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    'paymentIntegrations.mercadopago': validatedData
                }
            }
        );

        if (result.matchedCount === 0) {
            return {
                success: false,
                message: 'Tenant não encontrado.',
            };
        }

        revalidatePath('/settings');

        return {
            success: true,
            message: 'Configurações do Mercado Pago atualizadas com sucesso!',
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                message: error.errors.map(e => e.message).join(', '),
            };
        }

        console.error('Erro ao atualizar configurações do Mercado Pago:', error);
        return {
            success: false,
            message: 'Erro ao atualizar as configurações.',
        };
    }
}

// ===== PUSHINPAY =====

/**
 * Obtém as configurações do PushinPay do tenant logado
 */
export async function getPushinPaySettings(): Promise<PushinPaySettings | null> {
    try {
        const tenant = await getTenantFromSession();

        if (!tenant.paymentIntegrations?.pushinpay) {
            return null;
        }

        const ppSettings = tenant.paymentIntegrations.pushinpay;

        // Mask sensitive data
        return {
            ...ppSettings,
            sandbox_api_key: maskCredential(ppSettings.sandbox_api_key),
            sandbox_api_secret: maskCredential(ppSettings.sandbox_api_secret),
            production_api_key: maskCredential(ppSettings.production_api_key),
            production_api_secret: maskCredential(ppSettings.production_api_secret),
        };
    } catch (error) {
        console.error('Erro ao buscar configurações do PushinPay:', error);
        throw error;
    }
}

/**
 * Atualiza as configurações do PushinPay do tenant logado
 */
export async function updatePushinPaySettings(
    data: PushinPaySettings
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();

        // Valida os dados
        const validatedData = PushinPaySettingsSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const result = await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    'paymentIntegrations.pushinpay': validatedData
                }
            }
        );

        if (result.matchedCount === 0) {
            return {
                success: false,
                message: 'Tenant não encontrado.',
            };
        }

        revalidatePath('/settings');

        return {
            success: true,
            message: 'Configurações do PushinPay atualizadas com sucesso!',
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                message: error.errors.map(e => e.message).join(', '),
            };
        }

        console.error('Erro ao atualizar configurações do PushinPay:', error);
        return {
            success: false,
            message: 'Erro ao atualizar as configurações.',
        };
    }
}

// ===== STRIPE =====

/**
 * Obtém as configurações do Stripe do tenant logado
 */
export async function getStripeSettings(): Promise<StripeSettings | null> {
    try {
        const tenant = await getTenantFromSession();

        if (!tenant.paymentIntegrations?.stripe) {
            return null;
        }

        const stripeSettings = tenant.paymentIntegrations.stripe;

        // Mask sensitive data
        return {
            ...stripeSettings,
            test_secret_key: maskCredential(stripeSettings.test_secret_key),
            test_webhook_secret: maskCredential(stripeSettings.test_webhook_secret),
            live_secret_key: maskCredential(stripeSettings.live_secret_key),
            live_webhook_secret: maskCredential(stripeSettings.live_webhook_secret),
        };
    } catch (error) {
        console.error('Erro ao buscar configurações do Stripe:', error);
        throw error;
    }
}

/**
 * Atualiza as configurações do Stripe do tenant logado
 */
export async function updateStripeSettings(
    data: StripeSettings
): Promise<{ success: boolean; message: string }> {
    try {
        const tenant = await getTenantFromSession();

        // Valida os dados
        const validatedData = StripeSettingsSchema.parse(data);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const result = await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    'paymentIntegrations.stripe': validatedData
                }
            }
        );

        if (result.matchedCount === 0) {
            return {
                success: false,
                message: 'Tenant não encontrado.',
            };
        }

        revalidatePath('/settings');

        return {
            success: true,
            message: 'Configurações do Stripe atualizadas com sucesso!',
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                message: error.errors.map(e => e.message).join(', '),
            };
        }

        console.error('Erro ao atualizar configurações do Stripe:', error);
        return {
            success: false,
            message: 'Erro ao atualizar as configurações.',
        };
    }
}

/**
 * Valida a senha do tenant e retorna as configurações não mascaradas
 */
export async function getTenantUnmaskedSettings(password: string): Promise<{ success: boolean; data?: { mercadopago?: MercadoPagoSettings; pushinpay?: PushinPaySettings; stripe?: StripeSettings }; message: string }> {
    try {
        const tenant = await getTenantFromSession();
        const client = await clientPromise;
        const db = client.db('vematize');

        // Busca o usuário dono do tenant para validar a senha
        // O tenant.ownerEmail deve corresponder a um usuário na collection users
        const user = await db.collection<User>('users').findOne({ email: tenant.ownerEmail });

        if (!user || !user.password) {
            return { success: false, message: 'Usuário não encontrado ou sem senha configurada.' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return { success: false, message: 'Senha incorreta.' };
        }

        // Retorna dados não mascarados
        return {
            success: true,
            data: {
                mercadopago: tenant.paymentIntegrations?.mercadopago,
                pushinpay: tenant.paymentIntegrations?.pushinpay,
                stripe: tenant.paymentIntegrations?.stripe
            },
            message: 'Configurações desbloqueadas com sucesso.'
        };

    } catch (error) {
        console.error('Erro ao validar senha do tenant:', error);
        return { success: false, message: 'Erro ao validar senha.' };
    }
}


// ===== DISCORD SETTINGS =====

/**
 * Obtém as configurações do Discord do tenant logado
 */
export async function getDiscordSettings() {
    try {
        const tenant = await getTenantFromSession();
        return tenant.discordSettings || { couponsEnabled: true };
    } catch (error) {
        console.error('Erro ao buscar configurações do Discord:', error);
        return { couponsEnabled: true };
    }
}

/**
 * Atualiza as configurações do Discord do tenant logado
 */
export async function updateDiscordSettings(data: any) {
    try {
        const tenant = await getTenantFromSession();
        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    'discordSettings.couponsEnabled': data.couponsEnabled
                }
            }
        );

        revalidatePath('/settings');
        return { success: true, message: 'Configurações do Discord atualizadas!' };
    } catch (error) {
        console.error('Erro ao atualizar configurações do Discord:', error);
        return { success: false, message: 'Erro ao atualizar configurações.' };
    }
}
