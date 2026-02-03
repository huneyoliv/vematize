import { ObjectId } from 'mongodb';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { Tenant, Product } from '../types';
import { env } from '../config/env';

export async function createMercadoPagoPreference(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
    finalPriceOverride?: number
): Promise<{ success: boolean; message: string; preferenceId?: string; init_point?: string; }> {
    try {
        const mpSettings = tenant.paymentIntegrations?.mercadopago;
        if (!mpSettings) {
            return { success: false, message: 'O vendedor não configurou o Mercado Pago.' };
        }

        const isSandbox = mpSettings.mode === 'sandbox';
        const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

        if (!accessToken) {
            return { success: false, message: `As credenciais para o modo ${mpSettings.mode} do Mercado Pago não foram configuradas.` };
        }

        const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
        const preference = new Preference(client);

        const payerEmail = `${buyerId}@telegram.com`;

        let finalPrice = finalPriceOverride;

        if (finalPrice === undefined) {
            finalPrice = product.price;
            if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
                finalPrice = product.discountPrice;
            }
        }

        if (!finalPrice || finalPrice <= 0) {
            console.error('Tentativa de criar preferência com valor zero ou inválido:', finalPrice, product);
            return { success: false, message: 'O valor do produto deve ser maior que zero para pagamento.' };
        }

        const baseUrl = env.BASE_URL;
        if (!baseUrl) {
            console.error('BASE_URL não está configurada.');
            return { success: false, message: 'Configuração de URL base não encontrada.' };
        }

        const notification_url = `${baseUrl}/api/webhook/${isSandbox ? 'sandmercadopago' : 'mercadopago'}`;

        const body = {
            items: [
                {
                    id: product._id.toString(),
                    title: product.name,
                    quantity: 1,
                    unit_price: finalPrice,
                    currency_id: 'BRL',
                },
            ],
            payer: {
                email: payerEmail,
            },
            back_urls: {
                success: mpSettings.success_url || 'https://google.com',
                failure: mpSettings.failure_url || 'https://google.com',
                pending: mpSettings.pending_url || 'https://google.com',
            },
            auto_return: 'approved',
            notification_url: notification_url,
            external_reference: saleId,
        };

        console.log('MercadoPago Body:', JSON.stringify(body, null, 2));

        try {
            const result = await preference.create({ body });
            return {
                success: true,
                message: 'Preferência criada com sucesso.',
                preferenceId: result.id,
                init_point: result.init_point,
            };
        } catch (error: any) {
            console.error('Erro Mercado Pago:', error?.message, error?.response?.data || error);
            return { success: false, message: 'Erro ao criar preferência no Mercado Pago: ' + (error?.message || 'Erro desconhecido') };
        }

    } catch (error) {
        console.error('Failed to create Mercado Pago preference:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o link de pagamento.' };
    }
}

export async function createMercadoPagoPixPayment(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
    finalPriceOverride?: number
): Promise<{ success: boolean; message: string; qrCode?: string; qrCodeBase64?: string; paymentId?: number; }> {
    try {
        const { MercadoPagoConfig, Payment } = await import('mercadopago');

        const mpSettings = tenant.paymentIntegrations?.mercadopago;
        if (!mpSettings) return { success: false, message: 'O vendedor não configurou o Mercado Pago.' };

        const isSandbox = mpSettings.mode === 'sandbox';
        const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

        if (!accessToken) return { success: false, message: `As credenciais para o modo ${mpSettings.mode} do Mercado Pago não foram configuradas.` };

        const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
        const payment = new Payment(client);

        const payerEmail = `${buyerId}@telegram.com`;

        let finalPrice = finalPriceOverride;

        if (finalPrice === undefined) {
            finalPrice = product.price;
            if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
                finalPrice = product.discountPrice;
            }
        }

        if (!finalPrice || finalPrice <= 0) {
            return { success: false, message: 'O valor do produto deve ser maior que zero.' };
        }

        const baseUrl = env.BASE_URL;
        if (!baseUrl) {
            console.error('BASE_URL não está configurada.');
            return { success: false, message: 'Configuração de URL base não encontrada.' };
        }

        const notification_url = `${baseUrl}/api/webhook/${isSandbox ? 'sandmercadopago' : 'mercadopago'}`;

        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 30);

        const body = {
            transaction_amount: finalPrice,
            description: product.name,
            payment_method_id: 'pix',
            payer: {
                email: payerEmail,
                first_name: 'Comprador',
                last_name: 'Anônimo',
                identification: {
                    type: 'CPF',
                    number: '00000000000'
                },
            },
            notification_url: notification_url,
            external_reference: saleId,
            date_of_expiration: expirationDate.toISOString(),
        };

        try {
            const result = await payment.create({ body });

            if (!result.point_of_interaction?.transaction_data) {
                console.error('Mercado Pago PIX Error: Transaction data not found in response.', result);
                return { success: false, message: 'Não foi possível obter os dados do PIX.' };
            }

            return {
                success: true,
                message: 'Pagamento PIX criado com sucesso.',
                qrCode: result.point_of_interaction.transaction_data.qr_code,
                qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
                paymentId: result.id,
            };
        } catch (error: any) {
            console.error('Erro Mercado Pago (PIX):', error?.message, error?.response?.data || error);
            return { success: false, message: 'Erro ao criar pagamento PIX: ' + (error?.message || 'Erro desconhecido') };
        }

    } catch (error) {
        console.error('Failed to create Mercado Pago PIX payment:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o pagamento PIX.' };
    }
}

// ==========================================
// SAAS METHODS
// ==========================================

class MercadoPagoService {

    private async getMpSettings(tenantId: string) {
        if (tenantId === 'global') {
            const { default: clientPromise } = await import('../config/database');
            const client = await clientPromise;
            const db = client.db('vematize');
            const settings = await db.collection('settings').findOne({ _id: 'global' as any });

            if (!settings || !settings.paymentIntegrations?.mercadopago) {
                throw new Error('Global Mercado Pago integration not configured');
            }
            return settings.paymentIntegrations.mercadopago;
        } else {
            const tenantService = (await import('./tenant.service')).tenantService;
            const tenant = await tenantService.getTenantById(tenantId);

            if (!tenant || !tenant.paymentIntegrations?.mercadopago) {
                throw new Error('Mercado Pago not configured for tenant');
            }
            return tenant.paymentIntegrations.mercadopago;
        }
    }

    async createSaasSubscription(
        tenantId: string,
        plan: any,
        customer: any,
        backUrl: string,
        reason: string,
        externalReference: string
    ) {
        try {
            const { MercadoPagoConfig, PreApproval } = await import('mercadopago');

            const mpSettings = await this.getMpSettings(tenantId);

            console.log(`[MercadoPago] Creating Subscription for tenant ${tenantId}. Mode: ${mpSettings.mode}`);

            const isSandbox = mpSettings.mode === 'sandbox';
            const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

            console.log(`[MercadoPago] Using ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} token: ${accessToken ? accessToken.substring(0, 10) + '...' : 'undefined'}`);

            if (!accessToken) throw new Error('Mercado Pago access token not found');

            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
            const preApprovalClient = new PreApproval(client);

            const body = {
                payer_email: customer.email,
                back_url: backUrl,
                reason: reason,
                external_reference: externalReference,
                auto_recurring: {
                    frequency: plan.durationDays,
                    frequency_type: 'days',
                    transaction_amount: parseFloat(plan.price.toFixed(2)),
                    currency_id: 'BRL'
                },
                status: 'pending',
            };

            const result = await preApprovalClient.create({ body });
            return result;

        } catch (error: any) {
            console.error('Error creating SaaS Subscription:', error);
            throw error;
        }
    }

    async createSaasPreference(
        tenantId: string,
        items: any[],
        payer: any,
        backUrls: any,
        externalReference: string,
        notificationUrl: string
    ) {
        try {
            const { MercadoPagoConfig, Preference } = await import('mercadopago');

            const mpSettings = await this.getMpSettings(tenantId);

            console.log(`[MercadoPago] Creating Preference for tenant ${tenantId}. Mode: ${mpSettings.mode}`);

            const isSandbox = mpSettings.mode === 'sandbox';
            const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

            console.log(`[MercadoPago] Using ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} token: ${accessToken ? accessToken.substring(0, 10) + '...' : 'undefined'}`);

            if (!accessToken) throw new Error('Mercado Pago access token not found');

            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
            const preferenceClient = new Preference(client);

            const body = {
                items: items,
                payer: payer,
                back_urls: backUrls,
                auto_return: 'approved',
                external_reference: externalReference,
                notification_url: notificationUrl,
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [{ id: "ticket" }],
                    installments: 1
                }
            };

            const result = await preferenceClient.create({ body });
            return result;

        } catch (error: any) {
            console.error('Error creating SaaS Preference:', error);
            throw error;
        }
    }

    async createSaasPixPayment(
        tenantId: string,
        transactionAmount: number,
        description: string,
        payer: any,
        externalReference: string,
        notificationUrl: string
    ) {
        try {
            const { MercadoPagoConfig, Payment } = await import('mercadopago');

            const mpSettings = await this.getMpSettings(tenantId);

            console.log(`[MercadoPago] Creating Pix Payment for tenant ${tenantId}. Mode: ${mpSettings.mode}`);

            const isSandbox = mpSettings.mode === 'sandbox';
            const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

            console.log(`[MercadoPago] Using ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} token: ${accessToken ? accessToken.substring(0, 10) + '...' : 'undefined'}`);

            if (!accessToken) throw new Error('Mercado Pago access token not found');

            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
            const paymentClient = new Payment(client);

            const expirationDate = new Date();
            expirationDate.setMinutes(expirationDate.getMinutes() + 30);

            const body = {
                transaction_amount: parseFloat(transactionAmount.toFixed(2)),
                description: description,
                payment_method_id: 'pix',
                payer: payer,
                external_reference: externalReference,
                notification_url: notificationUrl,
                date_of_expiration: expirationDate.toISOString(),
            };

            const result = await paymentClient.create({ body });
            return result;

        } catch (error: any) {
            console.error('Error creating SaaS Pix Payment:', error);
            throw error;
        }
    }

    async getSaasPaymentStatus(tenantId: string, id: string) {
        try {
            const { MercadoPagoConfig, Payment, PreApproval } = await import('mercadopago');

            const mpSettings = await this.getMpSettings(tenantId);
            const isSandbox = mpSettings.mode === 'sandbox';
            const accessToken = isSandbox ? mpSettings.sandbox_access_token : mpSettings.production_access_token;

            if (!accessToken) throw new Error('Mercado Pago access token not found');

            const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });

            // Check if it's a PreApproval (Subscription) or a Payment (Pix)
            // PreApproval IDs are usually alphanumeric (e.g., 2c938084...). Payment IDs are numeric.
            const isPreApproval = !/^\d+$/.test(id);

            if (isPreApproval) {
                const preApprovalClient = new PreApproval(client);
                const preApproval = await preApprovalClient.get({ id });
                return {
                    type: 'subscription',
                    status: preApproval.status,
                    id: preApproval.id
                };
            } else {
                const paymentClient = new Payment(client);
                const payment = await paymentClient.get({ id });
                return {
                    type: 'payment',
                    status: payment.status,
                    id: payment.id
                };
            }

        } catch (error: any) {
            console.error('Error getting SaaS Payment Status:', error);
            throw error;
        }
    }
}

export const mercadoPagoService = new MercadoPagoService();
