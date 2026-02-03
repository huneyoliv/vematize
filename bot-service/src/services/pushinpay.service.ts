import { ObjectId } from 'mongodb';
import { Tenant, Product } from '../types';
import { env } from '../config/env';

/**
 * Cria um pagamento PIX via PushinPay
 */
export async function createPushinPayPixPayment(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
    finalPriceOverride?: number
): Promise<{ success: boolean; message: string; qrCode?: string; qrCodeBase64?: string; paymentId?: string; }> {
    try {
        const ppSettings = tenant.paymentIntegrations?.pushinpay;
        if (!ppSettings) {
            return { success: false, message: 'O vendedor não configurou o PushinPay.' };
        }

        const isSandbox = ppSettings.mode === 'sandbox';
        const apiKey = isSandbox ? ppSettings.sandbox_api_key : ppSettings.production_api_key;

        if (!apiKey) {
            return { success: false, message: `As credenciais para o modo ${ppSettings.mode} do PushinPay não foram configuradas.` };
        }

        let finalPrice = finalPriceOverride;

        if (finalPrice === undefined) {
            finalPrice = product.price;
            if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
                finalPrice = product.discountPrice;
            }
        }

        if (!finalPrice || finalPrice <= 0) {
            console.error('Tentativa de criar pagamento com valor zero ou inválido:', finalPrice, product);
            return { success: false, message: 'O valor do produto deve ser maior que zero para pagamento.' };
        }

        const baseUrl = env.BASE_URL;
        if (!baseUrl) {
            console.error('BASE_URL não está configurada.');
            return { success: false, message: 'Configuração de URL base não encontrada.' };
        }

        const webhookUrl = `${baseUrl}/api/webhook/${isSandbox ? 'sandpushinpay' : 'pushinpay'}`;

        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 30);

        // Monta o payload para a API do PushinPay
        const payload = {
            amount: finalPrice,
            description: product.name,
            external_reference: saleId,
            webhook_url: webhookUrl,
            expiration_date: expirationDate.toISOString(),
            payer: {
                email: `${buyerId}@buyer.com`,
                name: 'Comprador',
            },
        };

        console.log('PushinPay Body:', JSON.stringify(payload, null, 2));

        try {
            // URL base da API do PushinPay (ajustar conforme documentação real)
            const apiBaseUrl = isSandbox
                ? 'https://sandbox-api.pushinpay.com.br'
                : 'https://api.pushinpay.com.br';

            const response = await fetch(`${apiBaseUrl}/v1/pix/payments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro PushinPay:', errorData);
                return {
                    success: false,
                    message: `Erro ao criar pagamento PIX: ${errorData.message || response.statusText}`
                };
            }

            const data = await response.json();

            if (!data.qr_code) {
                console.error('PushinPay PIX Error: QR Code not found in response.', data);
                return { success: false, message: 'Não foi possível obter o QR Code PIX.' };
            }

            return {
                success: true,
                message: 'Pagamento PIX criado com sucesso.',
                qrCode: data.qr_code,
                qrCodeBase64: data.qr_code_base64,
                paymentId: data.payment_id || data.id,
            };

        } catch (error: any) {
            console.error('Erro PushinPay (PIX):', error?.message, error);
            return { success: false, message: 'Erro ao criar pagamento PIX: ' + (error?.message || 'Erro desconhecido') };
        }

    } catch (error) {
        console.error('Failed to create PushinPay PIX payment:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o pagamento PIX.' };
    }
}

/**
 * Cria um link de pagamento via PushinPay (cartão de crédito)
 */
export async function createPushinPayCheckout(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
    finalPriceOverride?: number
): Promise<{ success: boolean; message: string; checkoutUrl?: string; paymentId?: string; }> {
    try {
        const ppSettings = tenant.paymentIntegrations?.pushinpay;
        if (!ppSettings) {
            return { success: false, message: 'O vendedor não configurou o PushinPay.' };
        }

        const isSandbox = ppSettings.mode === 'sandbox';
        const apiKey = isSandbox ? ppSettings.sandbox_api_key : ppSettings.production_api_key;

        if (!apiKey) {
            return { success: false, message: `As credenciais para o modo ${ppSettings.mode} do PushinPay não foram configuradas.` };
        }

        let finalPrice = finalPriceOverride;

        if (finalPrice === undefined) {
            finalPrice = product.price;
            if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
                finalPrice = product.discountPrice;
            }
        }

        if (!finalPrice || finalPrice <= 0) {
            return { success: false, message: 'O valor do produto deve ser maior que zero para pagamento.' };
        }

        const baseUrl = env.BASE_URL;
        if (!baseUrl) {
            return { success: false, message: 'Configuração de URL base não encontrada.' };
        }

        const webhookUrl = `${baseUrl}/api/webhook/${isSandbox ? 'sandpushinpay' : 'pushinpay'}`;

        const payload = {
            amount: finalPrice,
            description: product.name,
            external_reference: saleId,
            webhook_url: webhookUrl,
            success_url: ppSettings.success_url || `${baseUrl}/success`,
            failure_url: ppSettings.failure_url || `${baseUrl}/failure`,
            pending_url: ppSettings.pending_url || `${baseUrl}/pending`,
            payer: {
                email: `${buyerId}@buyer.com`,
                name: 'Comprador',
            },
        };

        console.log('PushinPay Checkout Body:', JSON.stringify(payload, null, 2));

        try {
            const apiBaseUrl = isSandbox
                ? 'https://sandbox-api.pushinpay.com.br'
                : 'https://api.pushinpay.com.br';

            const response = await fetch(`${apiBaseUrl}/v1/checkout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro PushinPay:', errorData);
                return {
                    success: false,
                    message: `Erro ao criar checkout: ${errorData.message || response.statusText}`
                };
            }

            const data = await response.json();

            return {
                success: true,
                message: 'Link de pagamento criado com sucesso.',
                checkoutUrl: data.checkout_url || data.init_point,
                paymentId: data.payment_id || data.id,
            };

        } catch (error: any) {
            console.error('Erro PushinPay (Checkout):', error?.message, error);
            return { success: false, message: 'Erro ao criar link de pagamento: ' + (error?.message || 'Erro desconhecido') };
        }

    } catch (error) {
        console.error('Failed to create PushinPay checkout:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o link de pagamento.' };
    }
}
