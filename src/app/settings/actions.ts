'use server';

import clientPromise from '@/lib/mongodb';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { MercadoPagoSettingsSchema, PushinPaySettingsSchema, StripeSettingsSchema } from '@/lib/schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export type MercadoPagoSettings = z.infer<typeof MercadoPagoSettingsSchema>;
export type PushinPaySettings = z.infer<typeof PushinPaySettingsSchema>;
export type StripeSettings = z.infer<typeof StripeSettingsSchema>;

/**
 * Obtém as configurações do Mercado Pago do tenant logado
 */
export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings | null> {
    try {
        const tenant = await getTenantFromSession();
        
        if (!tenant.paymentIntegrations?.mercadopago) {
            return null;
        }

        return tenant.paymentIntegrations.mercadopago;
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

        return tenant.paymentIntegrations.pushinpay;
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

        return tenant.paymentIntegrations.stripe;
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

