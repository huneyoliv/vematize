import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';

// Interface simplificada do Tenant (apenas o necessário para o bot)
export interface Tenant {
    _id: ObjectId;
    paymentIntegrations?: {
        mercadopago?: {
            mode: 'sandbox' | 'production';
            sandbox_access_token?: string;
            production_access_token?: string;
        };
        efi?: {
            mode: 'sandbox' | 'production';
            sandbox_client_id?: string;
            sandbox_client_secret?: string;
            production_client_id?: string;
            production_client_secret?: string;
            pix_key?: string;
            certificate?: string;
        };
    };
    connections?: {
        discord?: {
            botToken?: string;
            publicKey?: string;
        };
    };
}

export class TenantService {
    async getTenantById(tenantId: string): Promise<Tenant | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const tenantsCollection = db.collection<Tenant>('tenants');

            return await tenantsCollection.findOne({ _id: new ObjectId(tenantId) });
        } catch (error) {
            logger.error('Error fetching tenant:', error);
            return null;
        }
    }
}

export const tenantService = new TenantService();
