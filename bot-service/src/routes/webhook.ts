import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';
import { Tenant, Sale } from '../types';
import { deliverProductDiscord, deliverProductTelegram } from '../services/delivery.service';

const router = express.Router();

const handleWebhook = async (req: Request, res: Response) => {
    const { username, gateway } = req.params;

    if (!gateway) {
        return res.status(400).json({ success: false, message: 'Invalid request.' });
    }

    try {
        const body = req.body;
        logger.info(`[Webhook] Received notification from gateway: '${gateway}'`);

        const db = (await clientPromise).db('vematize');
        const salesCol = db.collection<Sale>('sales');
        const tenantsCol = db.collection<Tenant>('tenants');

        switch (gateway) {
            case 'mercadopago':
            case 'sandmercadopago': {
                const { MercadoPagoConfig, Payment } = await import('mercadopago');
                const isSandbox = gateway === 'sandmercadopago';

                const notification = body;

                if (notification.type !== 'payment' && notification.topic !== 'payment') {
                    if (!notification.data?.id) {
                        logger.info("[Webhook MP] Not a payment notification or missing ID. Skipping.");
                        return res.json({ success: true });
                    }
                }

                const paymentId = notification.data?.id || notification.id;

                if (!paymentId) {
                    return res.json({ success: true });
                }

                let sale = await salesCol.findOne({ 'paymentDetails.paymentId': paymentId });

                if (!sale) {
                    const recentDate = new Date();
                    recentDate.setMinutes(recentDate.getMinutes() - 10);
                    sale = await salesCol.findOne({
                        status: 'pending',
                        paymentGateway: gateway,
                        createdAt: { $gte: recentDate }
                    });
                }

                if (!sale) {
                    logger.error(`[Webhook MP] Sale not found for payment ${paymentId}`);
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }

                const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });
                if (!tenant) {
                    return res.status(404).json({ success: false, message: 'Tenant not found.' });
                }

                const mpSettings = tenant.paymentIntegrations?.mercadopago;
                const accessToken = isSandbox ? mpSettings?.sandbox_access_token : mpSettings?.production_access_token;

                if (!accessToken) {
                    return res.status(500).json({ success: false, message: 'Access token not configured.' });
                }

                const client = new MercadoPagoConfig({ accessToken });
                const payment = new Payment(client);
                const mpPayment = await payment.get({ id: paymentId });

                if (!mpPayment) {
                    return res.status(404).json({ success: false, message: 'Payment not found on MP.' });
                }

                logger.info(`[Webhook MP] Payment status: ${mpPayment.status} for sale ${sale._id}`);

                const newStatus = mpPayment.status === 'approved' ? 'approved' :
                    mpPayment.status === 'rejected' || mpPayment.status === 'cancelled' ? 'failed' :
                        'pending';

                if (sale.status !== newStatus) {
                    await salesCol.updateOne(
                        { _id: sale._id },
                        {
                            $set: {
                                status: newStatus,
                                webhookVerified: true,
                                updatedAt: new Date(),
                                'paymentDetails.paymentId': paymentId,
                                'paymentDetails.status': mpPayment.status
                            }
                        }
                    );

                    if (newStatus === 'approved') {
                        await handleDelivery(sale._id.toString());
                    }
                }

                return res.json({ success: true });
            }

            case 'stripe':
            case 'sandstripe':
            case 'teststripe': {
                const Stripe = (await import('stripe')).default;
                const isTest = gateway === 'sandstripe' || gateway === 'teststripe';

                const sig = req.headers['stripe-signature'];
                if (!sig) {
                    return res.status(400).json({ success: false, message: 'Missing signature.' });
                }

                const rawBody = (req as any).rawBody;
                if (!rawBody) {
                    logger.error('[Webhook Stripe] Raw body not available.');
                    return res.status(500).json({ success: false, message: 'Server configuration error.' });
                }

                let event;
                try {
                    event = JSON.parse(rawBody);
                } catch (err) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON.' });
                }

                const saleId = event.data?.object?.metadata?.saleId || event.data?.object?.client_reference_id;

                if (!saleId) {
                    return res.json({ success: true });
                }

                const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                if (!sale) {
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }

                const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });
                if (!tenant) {
                    return res.status(404).json({ success: false, message: 'Tenant not found.' });
                }

                const stripeSettings = tenant.paymentIntegrations?.stripe;
                const webhookSecret = isTest ? stripeSettings?.test_webhook_secret : stripeSettings?.live_webhook_secret;
                const secretKey = isTest ? stripeSettings?.test_secret_key : stripeSettings?.live_secret_key;

                if (!secretKey) {
                    return res.status(500).json({ success: false, message: 'Stripe not configured.' });
                }

                const stripe = new Stripe(secretKey, { apiVersion: '2025-09-30.clover' as any });

                if (webhookSecret) {
                    try {
                        event = stripe.webhooks.constructEvent(rawBody, sig as string, webhookSecret);
                    } catch (err: any) {
                        logger.error(`[Webhook Stripe] Signature validation failed: ${err.message}`);
                        return res.status(400).json({ success: false, message: 'Invalid signature.' });
                    }
                }

                logger.info(`[Webhook Stripe] Event type: ${event.type} for sale ${sale._id}`);

                let newStatus = sale.status;
                if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
                    newStatus = 'approved';
                } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
                    newStatus = 'failed';
                }

                if (sale.status !== newStatus) {
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
                        await handleDelivery(sale._id.toString());
                    }
                }

                return res.json({ success: true });
            }

            case 'pushinpay':
            case 'sandpushinpay': {
                const isSandbox = gateway === 'sandpushinpay';
                logger.info(`Processing Tenant PushinPay webhook in ${isSandbox ? 'Sandbox' : 'Production'} mode...`);

                const { payment_id, external_reference, status } = body;

                if (!payment_id || !external_reference) {
                    logger.info("[Webhook PushinPay] Missing required fields.");
                    return res.status(400).json({ success: false, message: 'Missing required fields.' });
                }

                const sale = await salesCol.findOne({ _id: new ObjectId(external_reference) });

                if (!sale) {
                    logger.error(`[Webhook PushinPay] Sale not found: ${external_reference}`);
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }

                const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });

                if (!tenant) {
                    logger.error(`[Webhook PushinPay] Tenant not found: ${sale.tenantId}`);
                    return res.status(404).json({ success: false, message: 'Tenant not found.' });
                }

                logger.info(`[Webhook PushinPay] Payment status: ${status} for sale ${sale._id}`);

                const newStatus = status === 'paid' || status === 'approved' ? 'approved' :
                    status === 'rejected' || status === 'cancelled' ? 'failed' :
                        'pending';

                if (sale.status !== newStatus) {
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
                        await handleDelivery(sale._id.toString());
                    }
                }

                return res.json({ success: true });
            }

            default:
                logger.warn(`[Webhook] Gateway '${gateway}' not supported.`);
                return res.status(400).json({ success: false, message: 'Gateway not supported' });
        }

    } catch (error: any) {
        logger.error('[Webhook] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Support both old and new URL formats
router.post('/api/webhook/:username/:gateway', handleWebhook);
router.post('/:username/webhook/:gateway', handleWebhook);

async function handleDelivery(saleId: string) {
    logger.info(`[Delivery] Triggering delivery for sale ${saleId}`);
    try {
        const db = (await clientPromise).db('vematize');
        const sale = await db.collection<Sale>('sales').findOne({ _id: new ObjectId(saleId) });
        if (!sale) return;

        if (sale.discordThreadId) {
            await deliverProductDiscord(sale);
        } else if (sale.telegramChatId) {
            await deliverProductTelegram(sale);
        }
    } catch (e) {
        logger.error(`[Delivery] Failed to deliver for sale ${saleId}:`, e);
    }
}

export default router;
