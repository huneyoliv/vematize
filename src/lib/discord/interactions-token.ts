import { randomBytes } from 'crypto';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Gera um token único para interactions do Discord
 */
export function generateInteractionsToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Obtém ou cria o token de interactions para um tenant
 */
export async function getOrCreateInteractionsToken(tenantId: ObjectId): Promise<string> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');

    const tenant = await tenantsCollection.findOne({ _id: tenantId });

    if (tenant?.discordInteractionsToken) {
        return tenant.discordInteractionsToken;
    }

    // Cria novo token
    const newToken = generateInteractionsToken();
    
    await tenantsCollection.updateOne(
        { _id: tenantId },
        { 
            $set: { 
                discordInteractionsToken: newToken,
                discordInteractionsTokenCreatedAt: new Date()
            } 
        }
    );

    return newToken;
}

/**
 * Regenera o token de interactions (útil se houver comprometimento)
 */
export async function regenerateInteractionsToken(tenantId: ObjectId): Promise<string> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');

    const newToken = generateInteractionsToken();
    
    await tenantsCollection.updateOne(
        { _id: tenantId },
        { 
            $set: { 
                discordInteractionsToken: newToken,
                discordInteractionsTokenCreatedAt: new Date()
            },
            $push: {
                discordInteractionsTokenHistory: {
                    token: newToken,
                    createdAt: new Date(),
                    reason: 'regenerated'
                }
            }
        } as any
    );

    return newToken;
}

/**
 * Valida um token de interactions e retorna o tenant completo
 * @returns Tenant completo ou null se token inválido
 */
export async function validateInteractionsToken(token: string): Promise<any | null> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');

    const tenant = await tenantsCollection.findOne({
        discordInteractionsToken: token
    });

    if (!tenant) {
        console.log('[Interactions Token] Token not found in database:', token.substring(0, 8) + '...');
        return null;
    }

    console.log('[Interactions Token] Token validated for tenant:', tenant.subdomain);
    return tenant;
}

