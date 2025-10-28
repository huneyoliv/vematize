import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Tenant, Sale } from '@/lib/types';
import crypto from 'crypto';

/**
 * Handles webhook notifications from payment gateways for tenant products
 * Route: /api/webhook/[gateway]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { gateway: string } }
) {
  const { gateway } = params;
  
  if (!gateway) {
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
  }

  const requestBody = await request.text();

  try {
    const body = JSON.parse(requestBody);
    console.log(`[Tenant Webhook] Received notification from gateway: '${gateway}'`);
    
    switch(gateway) {
        case 'mercadopago':
        case 'sandmercadopago': {
            const { MercadoPagoConfig, Payment } = await import('mercadopago');
            const db = (await clientPromise).db('vematize');
            
            const isSandbox = gateway === 'sandmercadopago';
            console.log(`Processing Tenant MP webhook in ${isSandbox ? 'Sandbox' : 'Production'} mode...`);
            
            if (body.type !== 'payment' || !body.data?.id) {
                console.log("[Tenant MP Webhook] Not a payment notification. Skipping.");
                return NextResponse.json({ success: true });
            }

            const paymentId = body.data.id;
            
            // Busca o pagamento para obter o external_reference (saleId)
            // Primeiro tentamos obter informações básicas do pagamento sem credenciais
            // Depois buscamos a sale para identificar o tenant
            
            const salesCol = db.collection<Sale>('sales');
            
            // Tenta encontrar a sale pelo paymentId armazenado
            let sale = await salesCol.findOne({
                'paymentDetails.paymentId': paymentId
            });

            if (!sale) {
                // Fallback: busca sale pendente recente (último minuto)
                const recentDate = new Date();
                recentDate.setMinutes(recentDate.getMinutes() - 5);
                
                sale = await salesCol.findOne({
                    status: 'pending',
                    paymentGateway: gateway,
                    createdAt: { $gte: recentDate }
                });
            }

            if (!sale) {
                console.error(`[Tenant MP Webhook] Sale not found for payment ${paymentId}`);
                return NextResponse.json({ success: false, message: 'Sale not found.' }, { status: 404 });
            }

            const tenantsCol = db.collection<Tenant>('tenants');
            const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });

            if (!tenant) {
                console.error(`[Tenant MP Webhook] Tenant not found: ${sale.tenantId}`);
                return NextResponse.json({ success: false, message: 'Tenant not found.' }, { status: 404 });
            }

            const mpSettings = tenant.paymentIntegrations?.mercadopago;
            const accessToken = isSandbox ? mpSettings?.sandbox_access_token : mpSettings?.production_access_token;

            if (!accessToken) {
                console.error(`[Tenant MP Webhook] Access Token not found for tenant ${tenant.subdomain}`);
                return NextResponse.json({ success: false, message: 'Access token not configured.' }, { status: 500 });
            }

            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);
            const mpPayment = await payment.get({ id: paymentId });

            if (!mpPayment) {
                console.error(`[Tenant MP Webhook] Payment ${paymentId} not found on MP.`);
                return NextResponse.json({ success: false, message: 'Payment not found.' }, { status: 404 });
            }
            
            console.log(`[Tenant MP Webhook] Payment status: ${mpPayment.status} for sale ${sale._id}`);

            // Atualiza status da venda
            const newStatus = mpPayment.status === 'approved' ? 'approved' : 
                             mpPayment.status === 'rejected' || mpPayment.status === 'cancelled' ? 'failed' : 
                             'pending';

            await salesCol.updateOne(
                { _id: sale._id },
                { 
                    $set: { 
                        status: newStatus,
                        webhookVerified: true,
                        updatedAt: new Date()
                    } 
                }
            );

            // Se aprovado, entregar o produto
            if (newStatus === 'approved') {
                console.log(`[Tenant MP Webhook] Payment approved for sale ${sale._id}. Triggering delivery...`);
                
                // Delega a entrega para o handler apropriado (Discord ou Telegram)
                if (sale.discordThreadId) {
                    const { handleDiscordPaymentConfirmation } = await import('@/lib/discord/botFactory');
                    await handleDiscordPaymentConfirmation(sale._id.toString());
                } else if (sale.telegramChatId) {
                    // TODO: Implementar handler de entrega do Telegram
                    console.log('[Tenant MP Webhook] Telegram delivery not yet implemented');
                }
            }

            return NextResponse.json({ success: true });
        }

        case 'pushinpay':
        case 'sandpushinpay': {
            const db = (await clientPromise).db('vematize');
            const isSandbox = gateway === 'sandpushinpay';
            
            console.log(`Processing Tenant PushinPay webhook in ${isSandbox ? 'Sandbox' : 'Production'} mode...`);
            
            // PushinPay webhook structure (ajustar conforme documentação real)
            const { payment_id, external_reference, status } = body;
            
            if (!payment_id || !external_reference) {
                console.log("[Tenant PushinPay Webhook] Missing required fields.");
                return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
            }

            const salesCol = db.collection<Sale>('sales');
            const sale = await salesCol.findOne({ _id: new ObjectId(external_reference) });

            if (!sale) {
                console.error(`[Tenant PushinPay Webhook] Sale not found: ${external_reference}`);
                return NextResponse.json({ success: false, message: 'Sale not found.' }, { status: 404 });
            }

            const tenantsCol = db.collection<Tenant>('tenants');
            const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });

            if (!tenant) {
                console.error(`[Tenant PushinPay Webhook] Tenant not found: ${sale.tenantId}`);
                return NextResponse.json({ success: false, message: 'Tenant not found.' }, { status: 404 });
            }

            console.log(`[Tenant PushinPay Webhook] Payment status: ${status} for sale ${sale._id}`);

            const newStatus = status === 'paid' || status === 'approved' ? 'approved' : 
                             status === 'rejected' || status === 'cancelled' ? 'failed' : 
                             'pending';

            await salesCol.updateOne(
                { _id: sale._id },
                { 
                    $set: { 
                        status: newStatus,
                        webhookVerified: true,
                        updatedAt: new Date()
                    } 
                }
            );

            if (newStatus === 'approved') {
                console.log(`[Tenant PushinPay Webhook] Payment approved for sale ${sale._id}. Triggering delivery...`);
                
                if (sale.discordThreadId) {
                    const { handleDiscordPaymentConfirmation } = await import('@/lib/discord/botFactory');
                    await handleDiscordPaymentConfirmation(sale._id.toString());
                } else if (sale.telegramChatId) {
                    console.log('[Tenant PushinPay Webhook] Telegram delivery not yet implemented');
                }
            }

            return NextResponse.json({ success: true });
        }

        case 'stripe':
        case 'sandstripe':
        case 'teststripe': {
            const Stripe = (await import('stripe')).default;
            const db = (await clientPromise).db('vematize');
            const isTest = gateway === 'sandstripe' || gateway === 'teststripe';
            
            console.log(`Processing Tenant Stripe webhook in ${isTest ? 'Test' : 'Live'} mode...`);
            
            const sig = request.headers.get('stripe-signature');
            
            if (!sig) {
                console.error('[Tenant Stripe Webhook] Missing signature');
                return NextResponse.json({ success: false, message: 'Missing signature.' }, { status: 400 });
            }

            // Para validar o webhook, precisamos do webhook secret
            // Como não sabemos qual tenant ainda, vamos extrair o saleId do evento
            
            let event;
            try {
                // Parse básico sem validação primeiro para obter metadados
                event = JSON.parse(requestBody);
            } catch (err) {
                console.error('[Tenant Stripe Webhook] Invalid JSON');
                return NextResponse.json({ success: false, message: 'Invalid JSON.' }, { status: 400 });
            }

            const saleId = event.data?.object?.metadata?.saleId || event.data?.object?.client_reference_id;
            
            if (!saleId) {
                console.error('[Tenant Stripe Webhook] No saleId in event');
                return NextResponse.json({ success: false, message: 'Sale ID not found.' }, { status: 400 });
            }

            const salesCol = db.collection<Sale>('sales');
            const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });

            if (!sale) {
                console.error(`[Tenant Stripe Webhook] Sale not found: ${saleId}`);
                return NextResponse.json({ success: false, message: 'Sale not found.' }, { status: 404 });
            }

            const tenantsCol = db.collection<Tenant>('tenants');
            const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });

            if (!tenant) {
                console.error(`[Tenant Stripe Webhook] Tenant not found: ${sale.tenantId}`);
                return NextResponse.json({ success: false, message: 'Tenant not found.' }, { status: 404 });
            }

            const stripeSettings = tenant.paymentIntegrations?.stripe;
            const webhookSecret = isTest ? stripeSettings?.test_webhook_secret : stripeSettings?.live_webhook_secret;
            const secretKey = isTest ? stripeSettings?.test_secret_key : stripeSettings?.live_secret_key;

            if (!secretKey) {
                console.error('[Tenant Stripe Webhook] Secret key not configured');
                return NextResponse.json({ success: false, message: 'Stripe not configured.' }, { status: 500 });
            }

            const stripe = new Stripe(secretKey, { apiVersion: '2025-09-30.clover' });

            // Valida a assinatura do webhook se o secret estiver configurado
            if (webhookSecret) {
                try {
                    event = stripe.webhooks.constructEvent(requestBody, sig, webhookSecret);
                } catch (err: any) {
                    console.error(`[Tenant Stripe Webhook] Signature validation failed: ${err.message}`);
                    return NextResponse.json({ success: false, message: 'Invalid signature.' }, { status: 400 });
                }
            }

            console.log(`[Tenant Stripe Webhook] Event type: ${event.type} for sale ${sale._id}`);

            // Processa diferentes tipos de eventos
            let newStatus = sale.status;

            if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
                newStatus = 'approved';
            } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
                newStatus = 'failed';
            }

            await salesCol.updateOne(
                { _id: sale._id },
                { 
                    $set: { 
                        status: newStatus,
                        webhookVerified: true,
                        updatedAt: new Date()
                    } 
                }
            );

            if (newStatus === 'approved') {
                console.log(`[Tenant Stripe Webhook] Payment approved for sale ${sale._id}. Triggering delivery...`);
                
                if (sale.discordThreadId) {
                    const { handleDiscordPaymentConfirmation } = await import('@/lib/discord/botFactory');
                    await handleDiscordPaymentConfirmation(sale._id.toString());
                } else if (sale.telegramChatId) {
                    console.log('[Tenant Stripe Webhook] Telegram delivery not yet implemented');
                }
            }

            return NextResponse.json({ success: true });
        }

        default:
            console.log(`[Tenant Webhook] Gateway '${gateway}' not supported.`);
            return NextResponse.json({ success: false, message: 'Gateway not supported' }, { status: 400 });
    }

  } catch (error) {
    console.error('[Tenant Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

