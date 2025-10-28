import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { Tenant, Product } from './types';

/**
 * Cria uma sessão de checkout do Stripe para pagamento com cartão
 */
export async function createStripeCheckoutSession(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
): Promise<{ success: boolean; message: string; checkoutUrl?: string; sessionId?: string; }> {
    try {
        const stripeSettings = tenant.paymentIntegrations?.stripe;
        if (!stripeSettings) {
            return { success: false, message: 'O vendedor não configurou o Stripe.' };
        }

        const isTest = stripeSettings.mode === 'test';
        const secretKey = isTest ? stripeSettings.test_secret_key : stripeSettings.live_secret_key;

        if (!secretKey) {
            return { success: false, message: `As credenciais para o modo ${stripeSettings.mode} do Stripe não foram configuradas.` };
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2025-09-30.clover',
        });

        let finalPrice = product.price;
        if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
            finalPrice = product.discountPrice;
        }

        if (!finalPrice || finalPrice <= 0) {
            console.error('Tentativa de criar sessão com valor zero ou inválido:', finalPrice, product);
            return { success: false, message: 'O valor do produto deve ser maior que zero para pagamento.' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            console.error('NEXT_PUBLIC_BASE_URL não está configurada. Configure no .env para usar webhooks do Stripe.');
            return { success: false, message: 'Configuração de URL base não encontrada. Configure NEXT_PUBLIC_BASE_URL no arquivo .env.' };
        }

        const successUrl = stripeSettings.success_url || `${baseUrl}/success`;
        const cancelUrl = stripeSettings.cancel_url || `${baseUrl}/cancel`;

        console.log('Stripe Checkout Body:', JSON.stringify({
            amount: finalPrice,
            product: product.name,
            saleId,
            successUrl,
            cancelUrl,
        }, null, 2));

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: product.name,
                                description: product.description || '',
                            },
                            unit_amount: Math.round(finalPrice * 100), // Stripe usa centavos
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: saleId,
                metadata: {
                    saleId: saleId,
                    tenantId: tenant._id.toString(),
                    productId: product._id.toString(),
                    buyerId: buyerId,
                },
            });

            return {
                success: true,
                message: 'Sessão de checkout criada com sucesso.',
                checkoutUrl: session.url || undefined,
                sessionId: session.id,
            };

        } catch (error: any) {
            console.error('Erro Stripe:', error?.message, error);
            return { success: false, message: 'Erro ao criar sessão de checkout: ' + (error?.message || 'Erro desconhecido') };
        }

    } catch (error) {
        console.error('Failed to create Stripe checkout session:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o checkout.' };
    }
}

/**
 * Cria um Payment Intent do Stripe para PIX (se disponível) ou outro método
 * Nota: O Stripe no Brasil ainda tem suporte limitado para PIX
 */
export async function createStripePixPayment(
    tenant: Tenant,
    product: Product & { _id: ObjectId },
    saleId: string,
    buyerId: string,
): Promise<{ success: boolean; message: string; qrCode?: string; paymentId?: string; }> {
    try {
        const stripeSettings = tenant.paymentIntegrations?.stripe;
        if (!stripeSettings) {
            return { success: false, message: 'O vendedor não configurou o Stripe.' };
        }

        const isTest = stripeSettings.mode === 'test';
        const secretKey = isTest ? stripeSettings.test_secret_key : stripeSettings.live_secret_key;

        if (!secretKey) {
            return { success: false, message: `As credenciais para o modo ${stripeSettings.mode} do Stripe não foram configuradas.` };
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2025-09-30.clover',
        });

        let finalPrice = product.price;
        if (product.discountPrice && product.offerExpiresAt && new Date(product.offerExpiresAt) > new Date()) {
            finalPrice = product.discountPrice;
        }

        if (!finalPrice || finalPrice <= 0) {
            return { success: false, message: 'O valor do produto deve ser maior que zero.' };
        }

        try {
            // Tenta criar um Payment Intent (o Stripe pode não ter PIX disponível em todas as regiões)
            // Esta é uma implementação de exemplo - ajustar conforme disponibilidade do Stripe
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(finalPrice * 100),
                currency: 'brl',
                payment_method_types: ['card'], // PIX pode não estar disponível
                description: product.name,
                metadata: {
                    saleId: saleId,
                    tenantId: tenant._id.toString(),
                    productId: product._id.toString(),
                    buyerId: buyerId,
                },
            });

            // Nota: O Stripe ainda não tem suporte completo para PIX
            // Esta função retorna erro sugerindo usar checkout com cartão
            return {
                success: false,
                message: 'O Stripe ainda não suporta PIX no Brasil. Use o método de cartão de crédito.',
            };

        } catch (error: any) {
            console.error('Erro Stripe (PIX):', error?.message, error);
            return { 
                success: false, 
                message: 'O Stripe ainda não suporta PIX. Use cartão de crédito.' 
            };
        }

    } catch (error) {
        console.error('Failed to create Stripe PIX payment:', error);
        return { success: false, message: 'Ocorreu um erro inesperado ao criar o pagamento PIX.' };
    }
}

