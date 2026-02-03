import EfiPay from 'sdk-node-apis-efi';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { tenantService } from './tenant.service';

export class EfiService {
    private async getEfiInstance(tenantId: string) {
        let config;

        if (tenantId === 'global') {
            const { default: clientPromise } = await import('../config/database');
            const client = await clientPromise;
            const db = client.db('vematize');
            // @ts-ignore
            const settings = await db.collection('settings').findOne({ _id: 'global' });

            if (!settings || !settings.paymentIntegrations?.efi) {
                throw new Error('Global Efí integration not configured');
            }
            config = settings.paymentIntegrations.efi;
        } else {
            const tenant = await tenantService.getTenantById(tenantId);
            if (!tenant || !tenant.paymentIntegrations?.efi) {
                throw new Error('Efí integration not configured for this tenant');
            }
            config = tenant.paymentIntegrations.efi;
        }

        const isProd = config.mode === 'production';

        const options = {
            sandbox: !isProd,
            client_id: (isProd ? config.production_client_id : config.sandbox_client_id) as string,
            client_secret: (isProd ? config.production_client_secret : config.sandbox_client_secret) as string,
            certificate: config.certificate,
            pem: true,
        };

        // Validate certificate
        if (!options.certificate || !fs.existsSync(options.certificate)) {
            throw new Error(`Certificate file not found at: ${options.certificate}`);
        }

        return new EfiPay(options);
    }

    async createPlan(tenantId: string, name: string, interval: number, price: number, repeats?: number) {
        try {
            const efi = await this.getEfiInstance(tenantId);

            const params = {};
            const body = {
                name: name,
                interval: interval,
                repeats: repeats,
            };

            const response = await efi.createPlan(params, body);
            return response;
        } catch (error) {
            logger.error('Error creating Efí plan:', error);
            throw error;
        }
    }

    /**
     * Creates a subscription in Efí and initiates payment (Pix).
     * 
     * This method performs two steps:
     * 1. Creates the subscription using `createSubscription`.
     * 2. Calls `paySubscription` to generate the payment info (Pix QR Code).
     * 
     * @param tenantId - The ID of the tenant (or 'global').
     * @param planId - The Efí Plan ID.
     * @param customer - Customer details (name, email, cpf, phone).
     * @param items - Items to be included in the subscription.
     * @returns The subscription object combined with payment data (QR Code).
     */
    /**
     * Creates a Pix Immediate Charge (Cobrança Imediata).
     */
    async createPixCharge(tenantId: string, customer: any, items: any[], customId?: string, expireSeconds: number = 600) {
        try {
            const efi = await this.getEfiInstance(tenantId);

            // Calculate total value
            const totalValue = items.reduce((acc, item) => acc + (item.value * item.amount), 0) / 100;

            // Get Pix Key
            let pixKey;
            if (tenantId === 'global') {
                const { default: clientPromise } = await import('../config/database');
                const client = await clientPromise;
                const db = client.db('vematize');
                // @ts-ignore
                const settings = await db.collection('settings').findOne({ _id: 'global' });
                pixKey = settings?.paymentIntegrations?.efi?.pix_key;
            } else {
                const tenant = await tenantService.getTenantById(tenantId);
                pixKey = tenant?.paymentIntegrations?.efi?.pix_key;
            }

            if (!pixKey) {
                throw new Error('Pix key not configured');
            }

            const body = {
                calendario: {
                    expiracao: expireSeconds
                },
                ...(customer.cpf && customer.cpf.replace(/\D/g, '') !== '00000000000' ? {
                    devedor: {
                        cpf: customer.cpf.replace(/\D/g, ''),
                        nome: customer.name
                    }
                } : {}),
                valor: {
                    original: totalValue.toFixed(2)
                },
                chave: pixKey,
                solicitacaoPagador: items.map(i => i.name).join(', '),
                infoAdicionais: [
                    {
                        nome: "Ref",
                        valor: customId || "Subscription"
                    }
                ]
            };

            const response = await efi.pixCreateImmediateCharge({}, body);

            // Generate QR Code
            const params = {
                id: response.loc.id
            };

            const qrCodeResponse = await efi.pixGenerateQRCode(params);

            return {
                ...response,
                pix: {
                    qrcode: qrCodeResponse.qrcode,
                    qrcode_image: qrCodeResponse.imagemQrcode
                },
                payment_url: qrCodeResponse.linkVisualizacao // Sometimes available
            };

        } catch (error: any) {
            logger.error('Error creating Efí Pix charge:', error);
            throw error;
        }
    }

    async getPixCharge(tenantId: string, txid: string) {
        try {
            const efi = await this.getEfiInstance(tenantId);
            const params = {
                txid: txid
            };
            const response = await efi.pixDetailCharge(params);
            return response;
        } catch (error: any) {
            logger.error('Error getting Efí Pix charge details:', error);
            throw error;
        }
    }

    /**
     * Creates a subscription in Efí.
     * 
     * If paymentMethod is 'pix', it creates a Pix Immediate Charge for the first payment.
     * Note: Efí's standard subscription API doesn't support "Pix Subscription" with auto-debit easily without OAuth permissions that are complex.
     * We will treat the first payment as a Pix Charge. Future recurring payments for Pix are usually manual or "Pix Automático" (which is new).
     * For now, we assume the user wants to pay the FIRST month via Pix.
     * 
     * @param tenantId - The ID of the tenant (or 'global').
     * @param planId - The Efí Plan ID.
     * @param customer - Customer details.
     * @param items - Items to be included.
     * @param customId - The local subscription ID.
     * @param paymentMethod - 'pix' or 'credit_card'/'boleto' (default: all/link).
     */
    async createSubscription(tenantId: string, planId: string, customer: any, items: any[], customId?: string, paymentMethod: 'pix' | 'link' = 'link') {
        console.log('[EfiService] createSubscription called with customer:', customer);
        try {
            const efi = await this.getEfiInstance(tenantId);

            if (paymentMethod === 'pix') {
                // For Pix, we create an immediate charge.
                // We don't strictly "link" it to the Efí Plan object in the API because Efí Plans are for their automated billing engine.
                // But we can track it locally.
                const pixCharge = await this.createPixCharge(tenantId, customer, items, customId);

                return {
                    data: {
                        subscription_id: pixCharge.txid, // Use txid as the reference
                        payment_url: pixCharge.payment_url,
                        pix: pixCharge.pix
                    },
                    payment: {
                        data: {
                            payment_url: pixCharge.payment_url,
                            pix: pixCharge.pix,
                            charge: pixCharge
                        }
                    }
                };
            }

            // Default: Create a Subscription Link (One Step)
            const params = {
                id: parseInt(planId)
            };

            const notificationUrl = `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/efi`;
            const isLocalhost = notificationUrl.includes('localhost') || notificationUrl.includes('127.0.0.1');

            const body = {
                items: items,
                settings: {
                    payment_method: 'all', // Allow both Boleto and Card
                    expire_at: new Date(Date.now() + 3600 * 1000 * 24 * 3).toISOString().split('T')[0], // Link valid for 3 days
                    request_delivery_address: false
                },
                metadata: {
                    custom_id: customId,
                    ...(isLocalhost ? {} : { notification_url: notificationUrl })
                }
            };

            // @ts-ignore - createOneStepSubscriptionLink is available in the SDK
            const subscription = await efi.createOneStepSubscriptionLink(params, body);

            // Structure the response to match what the controller expects
            return {
                data: {
                    subscription_id: subscription.data.subscription_id,
                    payment_url: subscription.data.payment_url,
                    // We don't get a QR code directly here, the user must visit the link
                    pix: null
                },
                payment: {
                    data: {
                        payment_url: subscription.data.payment_url
                    }
                }
            };

        } catch (error: any) {
            logger.error('Error creating Efí subscription:', error);
            if (error.response) {
                logger.error('Efí Response Data:', error.response.data);
            }
            logger.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    }

    async handleWebhook(data: any) {
        logger.info('Handling Efí webhook', data);
        // Verify signature if needed
        // Update local subscription status
    }

    async registerWebhook(tenantId: string, webhookUrl: string) {
        try {
            const efi = await this.getEfiInstance(tenantId);

            // Get Pix Key
            let pixKey;
            if (tenantId === 'global') {
                const { default: clientPromise } = await import('../config/database');
                const client = await clientPromise;
                const db = client.db('vematize');
                // @ts-ignore
                const settings = await db.collection('settings').findOne({ _id: 'global' });
                pixKey = settings?.paymentIntegrations?.efi?.pix_key;
            } else {
                const tenant = await tenantService.getTenantById(tenantId);
                pixKey = tenant?.paymentIntegrations?.efi?.pix_key;
            }

            if (!pixKey) {
                throw new Error('Pix key not configured');
            }

            const params = {
                chave: pixKey
            };

            const body = {
                webhookUrl: webhookUrl
            };

            const response = await efi.pixConfigWebhook(params, body);
            return response;
        } catch (error) {
            logger.error('Error registering Efí webhook:', error);
            throw error;
        }
    }
}

export const efiService = new EfiService();
