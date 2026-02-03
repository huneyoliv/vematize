'use server';

import clientPromise from '@/lib/mongodb';
import type { SaasPlan, Tenant, KrovSettings, MercadoPagoSettings } from '@/lib/types';
import { ObjectId } from 'mongodb';

import { headers } from 'next/headers';
import { Telegraf } from 'telegraf';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export type CurrentPlanInfo = {
    status: string;
    statusLabel: string;
    planName: string;
    price: number;
    features: string[];
    expiresAt: string | null;
    expiresAtLabel: string;
    planId: string | null;
};

// Internal Document Types
type SaasPlanDocument = Omit<SaasPlan, 'id'> & { _id: ObjectId };
type TenantDocument = Omit<Tenant, 'id'> & { _id: ObjectId };
type SubscriptionDocument = {
    _id: ObjectId;
    tenantId: ObjectId;
    planId: ObjectId;
    status: 'pending' | 'active' | 'cancelled' | 'failed';
    paymentGateway: string;
    gatewayRefId?: string; // The ID from Mercado Pago (payment id, preference id)
    createdAt: Date;
    paidAt?: Date;
    expiresAt?: Date;
    couponCode?: string;
}

async function processApprovedSubscription(db: any, subscription: SubscriptionDocument) {
    // ✅ PROTEÇÃO 1: Verifica se a subscription já está ativa
    if (subscription.status === 'active') {
        console.log(`[Subscription] Subscription ${subscription._id} is already active.`);
        return;
    }

    // ✅ PROTEÇÃO 2: Verifica se a subscription foi cancelada
    if (subscription.status === 'cancelled') {
        console.log(`[Subscription] Subscription ${subscription._id} was cancelled. Ignoring payment.`);
        return;
    }

    const plan = await db.collection('plans').findOne({ _id: subscription.planId });
    const tenant = await db.collection('tenants').findOne({ _id: subscription.tenantId });

    if (!plan || !tenant) {
        console.error(`[Subscription] Plan or Tenant not found for subscription ${subscription._id}`);
        throw new Error('Could not find plan or tenant for the subscription.');
    }

    // ✅ PROTEÇÃO 3: Se o tenant já tem plano ativo, verifica se é uma renovação ou upgrade
    if (tenant.subscriptionStatus === 'active') {
        // Se a subscription atual for a mesma que estamos tentando ativar, ignoramos (já foi processada)
        if (tenant.subscriptionId === subscription._id.toString()) {
            console.log(`[Subscription] Subscription ${subscription._id} is already the active one for tenant ${tenant._id}.`);
            return;
        }

        // Se for uma nova subscription (renovação/upgrade), permitimos
        console.log(`[Subscription] Tenant ${tenant._id} has active plan. Processing renewal/upgrade with subscription ${subscription._id}.`);

        // Opcional: Cancelar a subscription anterior se for diferente?
        // Por enquanto, apenas atualizamos a data de expiração e o plano.
    }

    const now = new Date();
    let subscriptionEndDate = new Date(now);

    // Se já tiver uma data de expiração futura, adicionamos os dias a ela
    if (tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) > now) {
        subscriptionEndDate = new Date(tenant.subscriptionEndsAt);
    }

    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + plan.durationDays);

    await db.collection('tenants').updateOne(
        { _id: subscription.tenantId },
        {
            $set: {
                planId: plan._id.toString(),
                subscriptionStatus: 'active',
                subscriptionEndsAt: subscriptionEndDate,
            }
        }
    );

    await db.collection('subscriptions').updateOne(
        { _id: subscription._id },
        {
            $set: {
                status: 'active',
                paidAt: now,
                expiresAt: subscriptionEndDate
            }
        }
    );

    // Increment Coupon Usage
    if (subscription.couponCode) {
        await db.collection('coupons').updateOne(
            { code: subscription.couponCode },
            { $inc: { currentUses: 1 } }
        );
        console.log(`[Subscription] Incremented usage for coupon ${subscription.couponCode}`);
    }

    console.log(`[Subscription] Tenant ${tenant.subdomain} successfully subscribed to plan ${plan.name}. Subscription ends on ${subscriptionEndDate.toISOString()}`);

    const krovSettings = await db.collection('settings').findOne({ _id: 'global' as any });
    const botToken = krovSettings?.notifications?.telegram?.bot_token;
    const chatId = krovSettings?.notifications?.telegram?.chat_id;

    if (botToken && chatId) {
        const bot = new Telegraf(botToken);
        const message = `
✅ **Nova Assinatura Ativada!**
--------------------------------
**Plataforma:** ${tenant.subdomain}
**Plano:** ${plan.name}
**Valor:** R$ ${plan.price.toFixed(2)}
**Expira em:** ${subscriptionEndDate.toLocaleDateString('pt-BR')}
        `;
        try {
            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('[Telegram] Failed to send subscription notification:', e);
        }
    }
}

export async function checkSubscriptionStatus(subscriptionId: string): Promise<{ success: boolean; status?: string; message?: string }> {
    try {
        const client = await clientPromise;
        const db = client.db('vematize');
        const subscriptionsCollection = db.collection<SubscriptionDocument>('subscriptions');

        const subscription = await subscriptionsCollection.findOne({ _id: new ObjectId(subscriptionId) });

        if (!subscription) {
            return { success: false, message: 'Assinatura não encontrada.' };
        }

        if (subscription.status === 'active') {
            return { success: true, status: 'active', message: 'Assinatura já está ativa!' };
        }

        if (subscription.paymentGateway === 'efi') {
            // Check if we have a reference ID (txid for Pix or subscriptionId)
            if (subscription.gatewayRefId) {
                // If it's a long string, it's likely a Pix TXID (32 chars)
                // Efí Subscription IDs are usually numeric strings
                const isPixTxid = subscription.gatewayRefId.length >= 30;

                if (isPixTxid) {
                    try {
                        const { BotServiceClient } = await import('@/lib/bot-service-client');
                        const botService = new BotServiceClient();
                        const response = await botService.get(`/api/v1/efi/pix-charge/${subscription.gatewayRefId}?tenantId=global`);

                        if (response.success && response.data) {
                            const status = response.data.status; // ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP

                            if (status === 'CONCLUIDA') {
                                await processApprovedSubscription(db, subscription);
                                return { success: true, status: 'active', message: 'Pagamento Pix confirmado!' };
                            } else {
                                return { success: false, status: status, message: `Aguardando pagamento Pix (Status: ${status}).` };
                            }
                        }
                    } catch (err) {
                        console.error("Error checking Efí Pix status:", err);
                    }
                }
            }

            // Fallback for subscriptions or if check failed
            return { success: false, status: subscription.status, message: 'Aguardando confirmação do pagamento.' };
        }

        if (subscription.paymentGateway === 'mercadopago' && subscription.gatewayRefId) {
            try {
                const { BotServiceClient } = await import('@/lib/bot-service-client');
                const botService = new BotServiceClient();
                const response = await botService.get(`/api/v1/mercadopago/saas/status/${subscription.gatewayRefId}?tenantId=global`);

                if (response.success && response.data) {
                    const { status } = response.data;

                    if (status === 'approved' || status === 'authorized') {
                        await processApprovedSubscription(db, subscription);
                        return { success: true, status: 'active', message: 'Pagamento confirmado e assinatura ativada!' };
                    } else {
                        return { success: false, status: status, message: `Aguardando aprovação (Status: ${status}).` };
                    }
                }
            } catch (err) {
                console.error("Error checking Mercado Pago status via Bot Service:", err);
            }
            // Fallback
            return { success: false, status: subscription.status, message: 'Aguardando confirmação do pagamento.' };
        }

    } catch (error) {
        console.error("Error checking subscription status:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message: errorMessage };
    }

    return { success: false, message: 'Status desconhecido.' };
}

export async function getPendingSubscription(): Promise<SubscriptionDocument | null> {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            console.log(`[Pending Check] Tenant not found from session`);
            return null;
        }

        const client = await clientPromise;
        const db = client.db('vematize');

        // Find the most recent pending subscription created in the last 35 minutes
        const thirtyFiveMinutesAgo = new Date(new Date().getTime() - 35 * 60 * 1000);

        const pendingSubscription = await db.collection<SubscriptionDocument>('subscriptions').findOne({
            tenantId: tenant._id,
            status: 'pending',
            createdAt: { $gte: thirtyFiveMinutesAgo }
        }, { sort: { createdAt: -1 } });

        if (!pendingSubscription) {
            return null;
        }

        // Return a serializable object
        return JSON.parse(JSON.stringify(pendingSubscription));

    } catch (error) {
        console.error("Error fetching pending subscription:", error);
        return null;
    }
}

/**
 * Cancela subscriptions pendentes antigas do tenant
 * Deve ser chamada quando o usuário volta para a página de planos
 * 
 * 🔒 PROTEÇÃO CRÍTICA:
 * - Se o tenant JÁ tem plano ativo, cancela TODAS as subscriptions pendentes (antigas ou novas)
 * - Caso contrário, cancela apenas subscriptions criadas há mais de 35 minutos
 */
export async function cancelOldPendingSubscriptions(): Promise<{ success: boolean; cancelledCount: number }> {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return { success: false, cancelledCount: 0 };
        }

        const client = await clientPromise;
        const db = client.db('vematize');

        // ✅ PROTEÇÃO: Se já tem plano ativo, cancela TODAS as subscriptions pendentes
        if (tenant.subscriptionStatus === 'active') {
            const result = await db.collection<SubscriptionDocument>('subscriptions').updateMany(
                {
                    tenantId: tenant._id,
                    status: 'pending'
                },
                {
                    $set: {
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancelReason: 'already_active'
                    }
                }
            );

            console.log(`[Subscription Cleanup] Tenant ${tenant._id} already has active plan. Cancelled ${result.modifiedCount} pending subscriptions.`);
            return { success: true, cancelledCount: result.modifiedCount };
        }

        // Cancela apenas subscriptions pendentes criadas há mais de 35 minutos
        const thirtyFiveMinutesAgo = new Date(new Date().getTime() - 35 * 60 * 1000);

        const result = await db.collection<SubscriptionDocument>('subscriptions').updateMany(
            {
                tenantId: tenant._id,
                status: 'pending',
                createdAt: { $lt: thirtyFiveMinutesAgo }
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelReason: 'expired'
                }
            }
        );

        console.log(`[Subscription Cleanup] Cancelled ${result.modifiedCount} old pending subscriptions for tenant ${tenant._id}`);

        return { success: true, cancelledCount: result.modifiedCount };

    } catch (error) {
        console.error("Error cancelling old pending subscriptions:", error);
        return { success: false, cancelledCount: 0 };
    }
}

export async function getAvailablePlans(): Promise<SaasPlan[]> {
    try {
        const client = await clientPromise;
        const db = client.db('vematize');
        const plansCollection = db.collection<SaasPlanDocument>('plans');

        const plans = await plansCollection.find({ isActive: true }).sort({ price: 1 }).toArray();

        // Serialize MongoDB objects to plain objects
        return plans.map(plan => ({
            id: plan._id.toString(),
            name: plan.name,
            price: plan.price,
            durationDays: plan.durationDays,
            features: plan.features || [],
            isActive: plan.isActive
        }));
    } catch (error) {
        console.error('Database Error fetching available plans:', error);
        return [];
    }
}

export async function getCurrentPlanInfo(): Promise<CurrentPlanInfo> {
    try {
        // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
        // Obtém o tenant da sessão atual
        let tenant: TenantDocument | null = null;
        try {
            tenant = await getTenantFromSession() as any;
        } catch (authError: any) {
            // Se não autenticado, retorna info básica sem dados sensíveis
            if (authError.message && authError.message.includes('Unauthorized')) {
                return {
                    status: 'none',
                    statusLabel: 'Não autenticado',
                    planName: 'N/A',
                    price: 0,
                    features: [],
                    expiresAt: null,
                    expiresAtLabel: 'Não autenticado',
                    planId: null,
                };
            }
            // Se Forbidden (tentando acessar outro tenant), lança erro
            throw authError;
        }

        const client = await clientPromise;
        const db = client.db('vematize');

        if (!tenant) {
            return {
                status: 'none',
                statusLabel: 'Nenhum plano encontrado',
                planName: 'Plano de Teste Gratuito',
                price: 0,
                features: [
                    'Acesso ao Telegram',
                    'Acesso ao Discord',
                    'Gestão de usuários completa',
                    'Dashboard de estatísticas',
                    'Suporte prioritário',
                    'Relatórios de vendas',
                ],
                expiresAt: null,
                expiresAtLabel: 'Data de expiração: N/A',
                planId: null,
            };
        }

        let plan: SaasPlan | null = null;
        if (tenant.planId) {
            const plansCollection = db.collection<SaasPlanDocument>('plans');
            const planDoc = await plansCollection.findOne({ _id: new ObjectId(tenant.planId) });
            if (planDoc) {
                plan = {
                    id: planDoc._id.toString(),
                    name: planDoc.name,
                    price: planDoc.price,
                    durationDays: planDoc.durationDays,
                    features: planDoc.features || [],
                    isActive: planDoc.isActive
                };
            }
        }

        const status = tenant.subscriptionStatus || 'inactive';
        let statusLabel = 'Inativo';
        let expiresAt = null;
        let expiresAtLabel = '';
        let planId = tenant.planId || null;
        const now = new Date();

        if (status === 'trialing') {
            expiresAt = tenant.trialEndsAt || null;

            // Verifica se o trial realmente expirou
            if (expiresAt && new Date(expiresAt) < now) {
                statusLabel = 'Trial Expirado';
                expiresAtLabel = `Seu teste gratuito expirou em ${new Date(expiresAt).toLocaleDateString('pt-BR')}. Assine um plano para continuar.`;
            } else {
                statusLabel = 'Em Teste';
                expiresAtLabel = expiresAt
                    ? `Seu teste expira em: ${new Date(expiresAt).toLocaleDateString('pt-BR')}`
                    : 'Data de expiração: N/A';
            }
        } else if (status === 'active') {
            expiresAt = tenant.subscriptionEndsAt || null;

            // Verifica se a assinatura expirou
            if (expiresAt && new Date(expiresAt) < now) {
                statusLabel = 'Assinatura Expirada';
                expiresAtLabel = `Sua assinatura expirou em ${new Date(expiresAt).toLocaleDateString('pt-BR')}. Renove para continuar.`;
            } else {
                statusLabel = 'Ativo';
                expiresAtLabel = expiresAt
                    ? `Sua assinatura expira em: ${new Date(expiresAt).toLocaleDateString('pt-BR')}`
                    : 'Renovação: (Em breve)';
            }
        } else {
            statusLabel = 'Expirado ou Inativo';
            expiresAtLabel = 'Seu plano não está ativo.';
        }

        return {
            status,
            statusLabel,
            planName: plan?.name || 'Plano de Teste Gratuito',
            price: plan?.price || 0,
            features: plan?.features || [
                'Acesso ao Telegram',
                'Acesso ao Discord',
                'Gestão de usuários completa',
                'Dashboard de estatísticas',
                'Suporte prioritário',
                'Relatórios de vendas',
            ],
            expiresAt,
            expiresAtLabel,
            planId,
        };
    } catch (error) {
        console.error('Database Error fetching current plan:', error);
        return {
            status: 'none',
            statusLabel: 'Erro ao carregar',
            planName: 'Indisponível',
            price: 0,
            features: [],
            expiresAt: null,
            expiresAtLabel: 'Não foi possível carregar os dados do plano.',
            planId: null,
        };
    }
}

export async function createSubscriptionPayment(
    planId: string,
    paymentMethod: 'pix' | 'card',
    couponCode?: string
): Promise<{ init_point?: string; qrCode?: string; qrCodeBase64?: string; subscriptionId?: string; error?: string }> {
    'use server';

    try {
        // 🔒 VALIDAÇÃO CRÍTICA DE AUTORIZAÇÃO
        const tenant = await getTenantFromSession() as any;
        if (!tenant) {
            throw new Error('Unauthorized: Tenant não encontrado na sessão');
        }

        const subdomain = tenant.username || tenant.subdomain;

        const client = await clientPromise;
        const db = client.db('vematize');

        // Platform subscriptions are paid to the Krov admin, so we use global settings
        const settings = await db.collection<KrovSettings>('settings').findOne({ _id: 'global' as any });
        const mpSettings = settings?.paymentIntegrations?.mercadopago;
        const efiSettings = settings?.paymentIntegrations?.efi;
        const stripeSettings = settings?.paymentIntegrations?.stripe;
        const ppSettings = settings?.paymentIntegrations?.pushinpay;

        if (!mpSettings && !efiSettings && !stripeSettings && !ppSettings) {
            throw new Error('O administrador do sistema não configurou um gateway de pagamento.');
        }

        // Determine which gateway to use based on preferences
        let activeGateway = 'mercadopago';

        if (paymentMethod === 'pix') {
            activeGateway = settings?.preferredPixGateway || 'mercadopago';
        } else {
            activeGateway = settings?.preferredCardGateway || 'mercadopago';
        }

        // Fallback logic if preferred gateway is not configured
        if (activeGateway === 'mercadopago' && (!mpSettings || !mpSettings.production_access_token && !mpSettings.sandbox_access_token)) {
            if (efiSettings?.production_client_id || efiSettings?.sandbox_client_id) activeGateway = 'efi';
            else if (ppSettings?.production_api_key || ppSettings?.sandbox_api_key) activeGateway = 'pushinpay';
        } else if (activeGateway === 'efi' && (!efiSettings || !efiSettings.production_client_id && !efiSettings.sandbox_client_id)) {
            if (mpSettings?.production_access_token || mpSettings?.sandbox_access_token) activeGateway = 'mercadopago';
        } else if (activeGateway === 'pushinpay' && (!ppSettings || !ppSettings.production_api_key && !ppSettings.sandbox_api_key)) {
            if (mpSettings?.production_access_token || mpSettings?.sandbox_access_token) activeGateway = 'mercadopago';
        }

        const newPlan = await db.collection<SaasPlanDocument>('plans').findOne({ _id: new ObjectId(planId) });
        if (!newPlan) {
            throw new Error('O plano selecionado não foi encontrado.');
        }

        let price = newPlan.price;
        let title = `Plano ${newPlan.name} - Vematize`;
        let freeDays = 0;

        // Coupon Logic
        let repeats: number | undefined = undefined;

        if (couponCode) {
            const coupon = await db.collection('coupons').findOne({ code: couponCode, isActive: true });
            if (coupon) {
                // Check if coupon is expired
                if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
                    // Expired
                } else if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
                    // Max uses reached
                } else {
                    // Check allowed plans
                    if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
                        if (!coupon.applicablePlans.includes(planId)) {
                            // Coupon not valid for this plan
                            // We should probably throw or ignore. For now, let's ignore the discount.
                            console.log(`[Coupon] Coupon ${couponCode} not valid for plan ${planId}`);
                        } else {
                            // Apply discount
                            if (coupon.type === 'percentage') {
                                price = price * (1 - coupon.value / 100);
                            } else if (coupon.type === 'fixed_amount') {
                                price = Math.max(0, price - coupon.value);
                            }
                            title += ` (Cupom: ${couponCode})`;

                            // Handle Duration
                            if (coupon.durationType === 'repeating' && coupon.durationMonths) {
                                repeats = coupon.durationMonths;
                                title += ` (${coupon.durationMonths} meses)`;
                            } else if (coupon.durationType === 'once') {
                                repeats = 1;
                                title += ` (Mensalidade Única)`;
                            }
                        }
                    } else {
                        // Apply discount (no plan restriction)
                        if (coupon.type === 'percentage') {
                            price = price * (1 - coupon.value / 100);
                        } else if (coupon.type === 'fixed_amount') {
                            price = Math.max(0, price - coupon.value);
                        }
                        title += ` (Cupom: ${couponCode})`;

                        // Handle Duration
                        if (coupon.durationType === 'repeating' && coupon.durationMonths) {
                            repeats = coupon.durationMonths;
                            title += ` (${coupon.durationMonths} meses)`;
                        } else if (coupon.durationType === 'once') {
                            repeats = 1;
                            title += ` (Mensalidade Única)`;
                        }
                    }
                }
            }
        }


        // Handle upgrade logic
        if (tenant.planId && tenant.subscriptionStatus === 'active' && tenant.subscriptionEndsAt) {
            const currentPlan = await db.collection<SaasPlanDocument>('plans').findOne({ _id: new ObjectId(tenant.planId) });
            if (currentPlan && newPlan.price > currentPlan.price) {
                const now = new Date();
                const endDate = new Date(tenant.subscriptionEndsAt);
                const remainingTime = endDate.getTime() - now.getTime();
                if (remainingTime > 0) {
                    const totalDaysInCycle = newPlan.durationDays;
                    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

                    const oldPlanDailyRate = currentPlan.price / currentPlan.durationDays;
                    const newPlanDailyRate = newPlan.price / newPlan.durationDays;

                    const remainingValueOnOldPlan = oldPlanDailyRate * remainingDays;
                    const costForNewPlanForRemainingDays = newPlanDailyRate * remainingDays;

                    const proratedPrice = costForNewPlanForRemainingDays - remainingValueOnOldPlan;
                    price = Math.max(0, proratedPrice);
                    title = `Upgrade para o Plano ${newPlan.name} (Proporcional)`;
                }
            }
        }

        if (price <= 0) {
            throw new Error("Não é possível processar um pagamento com valor zero.");
        }

        const subscriptionsCollection = db.collection<SubscriptionDocument>('subscriptions');
        const newSubscriptionData: Omit<SubscriptionDocument, '_id'> = {
            tenantId: tenant._id,
            planId: newPlan._id,
            status: 'pending',
            paymentGateway: activeGateway,
            createdAt: new Date(),
            couponCode: couponCode || undefined,
        };
        const newSubscription = await subscriptionsCollection.insertOne(newSubscriptionData as SubscriptionDocument);
        const subscriptionId = newSubscription.insertedId;

        // ==========================================
        // EFÍ INTEGRATION
        // ==========================================
        if (activeGateway === 'efi') {
            try {
                // Call bot-service to create subscription/payment
                const { BotServiceClient } = await import('@/lib/bot-service-client');
                const botService = new BotServiceClient();

                // Check if it's a Single Use Coupon (repeats === 1)
                if (repeats === 1) {
                    // Create Immediate Pix Charge
                    const chargeResponse = await botService.post('/api/v1/efi/pix-charge', {
                        tenantId: 'global',
                        customer: {
                            name: tenant.ownerName || tenant.subdomain || 'Cliente Vematize',
                            email: tenant.ownerEmail,
                            cpf: tenant.cpf || (efiSettings?.mode === 'sandbox' ? '06266858066' : '00000000000'),
                            phone: tenant.phone || '11999999999'
                        },
                        items: [{
                            name: title,
                            value: Math.round(price * 100),
                            amount: 1
                        }],
                        customId: subscriptionId.toString(),
                        expireSeconds: 600 // 10 minutes
                    });

                    if (!chargeResponse.success) {
                        throw new Error('Falha ao criar cobrança Pix na Efí: ' + chargeResponse.message);
                    }

                    const { txid, qrCode, qrCodeBase64, paymentUrl } = chargeResponse.data;
                    console.log('[Efí] Pix Charge created. TXID:', txid);

                    await subscriptionsCollection.updateOne({ _id: subscriptionId }, {
                        $set: {
                            gatewayRefId: txid,
                            status: 'pending' // Remains pending until webhook confirms
                        }
                    });

                    return {
                        subscriptionId: subscriptionId.toString(),
                        qrCode: qrCode,
                        qrCodeBase64: qrCodeBase64,
                        init_point: paymentUrl
                    };

                } else {
                    // Standard Subscription Flow (Recurring or Multi-month)

                    // Ensure plan exists in Efí (idempotent check in bot-service)
                    const planResponse = await botService.post('/api/v1/efi/plans', {
                        name: newPlan.name,
                        interval: newPlan.durationDays >= 30 ? 1 : newPlan.durationDays,
                        price: Math.round(price * 100), // Centavos
                        tenantId: 'global',
                        repeats: repeats
                    });

                    if (!planResponse.success) {
                        throw new Error('Falha ao criar plano na Efí: ' + planResponse.message);
                    }

                    const efiPlanId = planResponse.data.planId;

                    // Create subscription
                    const subResponse = await botService.post('/api/v1/efi/subscribe', {
                        planId: efiPlanId,
                        customer: {
                            name: tenant.ownerName || tenant.subdomain || 'Cliente Vematize',
                            email: tenant.ownerEmail,
                            cpf: tenant.cpf || (efiSettings?.mode === 'sandbox' ? '06266858066' : '00000000000'),
                            phone: tenant.phone || '11999999999'
                        },
                        items: [{
                            name: title,
                            value: Math.round(price * 100),
                            amount: 1
                        }],
                        tenantId: 'global',
                        subscriptionId: subscriptionId.toString(),
                        paymentMethod: paymentMethod
                    });

                    if (!subResponse.success) {
                        throw new Error('Falha ao criar assinatura na Efí: ' + subResponse.message);
                    }

                    const { subscriptionId: efiSubscriptionId, qrCode, qrCodeBase64, paymentUrl } = subResponse.data;
                    console.log('[Efí] QR Code Base64 received:', qrCodeBase64 ? qrCodeBase64.substring(0, 50) + '...' : 'null');

                    await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { gatewayRefId: efiSubscriptionId.toString() } });

                    return {
                        subscriptionId: subscriptionId.toString(),
                        qrCode: qrCode,
                        qrCodeBase64: qrCodeBase64,
                        init_point: paymentUrl
                    };
                }

            } catch (error: any) {
                console.error("Error creating Efí subscription:", error);
                await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { status: 'failed' } });
                throw new Error(error.message || 'Erro ao processar pagamento com Efí.');
            }
        }

        // ==========================================
        // MERCADO PAGO INTEGRATION
        // ==========================================
        if (activeGateway === 'mercadopago') {
            try {
                // Call bot-service to create subscription/payment
                const { BotServiceClient } = await import('@/lib/bot-service-client');
                const botService = new BotServiceClient();

                const isSandbox = mpSettings!.mode === 'sandbox';
                const gatewayName = isSandbox ? 'sandmercadopago' : 'mercadopago';

                // Determine Bot Service URL for Webhooks
                let botServiceUrl = process.env.BOT_SERVICE_URL;
                let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;

                if (!baseUrl) {
                    const h = headers();
                    const host = h.get('host');
                    if (host) {
                        const protocol = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
                        baseUrl = `${protocol}://${host}`;
                    }
                }

                if (!botServiceUrl) {
                    if (baseUrl) {
                        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                            botServiceUrl = 'http://localhost:8080';
                        } else {
                            // Production: assume api. subdomain
                            try {
                                const url = new URL(baseUrl);
                                // Ensure api. subdomain
                                if (!url.hostname.startsWith('api.')) {
                                    url.hostname = `api.${url.hostname}`;
                                }
                                url.pathname = ''; // Remove any path like /krov
                                botServiceUrl = url.toString().replace(/\/$/, '');
                            } catch (e) {
                                console.error('Error parsing baseUrl for botServiceUrl:', e);
                                botServiceUrl = baseUrl.replace('://', '://api.');
                            }
                        }
                    }
                }

                if (!botServiceUrl) {
                    throw new Error("Não foi possível determinar a URL do Bot Service para o Webhook.");
                }

                const notification_url = `${botServiceUrl}/${subdomain}/webhook/${gatewayName}`;
                console.log('[Actions] Generated Notification URL:', notification_url);
                console.log('[Actions] Bot Service URL:', botServiceUrl);

                const back_url = mpSettings!.success_url || `${baseUrl}/plan/return`;

                if (paymentMethod === 'card') {
                    if (repeats === 1) {
                        // Single Payment (Preference)
                        const response = await botService.post('/api/v1/mercadopago/saas/preference', {
                            tenantId: 'global',
                            items: [{
                                id: newPlan._id.toString(),
                                title: title,
                                quantity: 1,
                                unit_price: parseFloat(price.toFixed(2)),
                                currency_id: 'BRL'
                            }],
                            payer: {
                                name: tenant.ownerName || 'Cliente',
                                email: tenant.ownerEmail,
                                phone: {
                                    area_code: '11',
                                    number: tenant.phone || '999999999'
                                }
                            },
                            backUrls: {
                                success: back_url,
                                failure: back_url,
                                pending: back_url
                            },
                            externalReference: subscriptionId.toString(),
                            notificationUrl: notification_url
                        });

                        if (!response.success) {
                            throw new Error('Falha ao criar preferência no Mercado Pago: ' + response.message);
                        }

                        const preference = response.data;
                        await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { gatewayRefId: preference.id } });
                        return { init_point: preference.init_point!, subscriptionId: subscriptionId.toString() };

                    } else {
                        // Subscription (PreApproval)
                        const response = await botService.post('/api/v1/mercadopago/saas/subscribe', {
                            tenantId: 'global',
                            plan: {
                                durationDays: newPlan.durationDays,
                                price: price
                            },
                            customer: {
                                email: tenant.ownerEmail
                            },
                            backUrl: back_url,
                            reason: title,
                            externalReference: subscriptionId.toString()
                        });

                        if (!response.success) {
                            throw new Error('Falha ao criar assinatura no Mercado Pago: ' + response.message);
                        }

                        const preApproval = response.data;
                        await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { gatewayRefId: preApproval.id } });
                        return { init_point: preApproval.init_point, subscriptionId: subscriptionId.toString() };
                    }

                } else { // PIX
                    // Pix is typically one-time, but we treat it as a "subscription payment" for the period
                    const response = await botService.post('/api/v1/mercadopago/saas/pix-payment', {
                        tenantId: 'global',
                        transactionAmount: price,
                        description: title,
                        payer: {
                            email: tenant.ownerEmail,
                            first_name: tenant.ownerName || 'Comprador',
                            last_name: 'Vematize',
                            identification: {
                                type: 'CPF',
                                number: '00000000000'
                            }
                        },
                        externalReference: subscriptionId.toString(),
                        notificationUrl: notification_url
                    });

                    if (!response.success) {
                        throw new Error('Falha ao criar pagamento Pix no Mercado Pago: ' + response.message);
                    }

                    const pixPayment = response.data;
                    await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { gatewayRefId: pixPayment.id?.toString() } });

                    return {
                        qrCode: pixPayment.point_of_interaction?.transaction_data?.qr_code,
                        qrCodeBase64: pixPayment.point_of_interaction?.transaction_data?.qr_code_base64,
                        subscriptionId: subscriptionId.toString(),
                    };
                }

            } catch (error: any) {
                console.error("Error creating Mercado Pago subscription:", error);
                await subscriptionsCollection.updateOne({ _id: subscriptionId }, { $set: { status: 'failed' } });
                throw new Error(error.message || 'Erro ao processar pagamento com Mercado Pago.');
            }
        }

        throw new Error(`Gateway ${activeGateway} não suportado ou não configurado.`);

    } catch (error) {
        console.error("Error creating subscription preference:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { error: errorMessage };
    }
}

