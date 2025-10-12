'use server';

import clientPromise from '@/lib/mongodb';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { MercadoPagoSettingsSchema } from '@/lib/schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export type MercadoPagoSettings = z.infer<typeof MercadoPagoSettingsSchema>;

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

