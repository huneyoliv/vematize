"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const delivery_service_1 = require("../services/delivery.service");
const router = express_1.default.Router();
const handleWebhook = async (req, res) => {
    const { username, gateway } = req.params;
    if (!gateway) {
        return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    try {
        const body = req.body;
        logger_1.default.info(`[Webhook] Received notification from gateway: '${gateway}'`);
        const db = (await database_1.default).db('vematize');
        const salesCol = db.collection('sales');
        const tenantsCol = db.collection('tenants');
        switch (gateway) {
            case 'mercadopago':
            case 'sandmercadopago': {
                const { MercadoPagoConfig, Payment } = await Promise.resolve().then(() => __importStar(require('mercadopago')));
                const isSandbox = gateway === 'sandmercadopago';
                const notification = body;
                if (notification.type !== 'payment' && notification.topic !== 'payment') {
                    if (!notification.data?.id) {
                        logger_1.default.info("[Webhook MP] Not a payment notification or missing ID. Skipping.");
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
                    logger_1.default.error(`[Webhook MP] Sale not found for payment ${paymentId}`);
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }
                const tenant = await tenantsCol.findOne({ _id: new mongodb_1.ObjectId(sale.tenantId) });
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
                logger_1.default.info(`[Webhook MP] Payment status: ${mpPayment.status} for sale ${sale._id}`);
                const newStatus = mpPayment.status === 'approved' ? 'approved' :
                    mpPayment.status === 'rejected' || mpPayment.status === 'cancelled' ? 'failed' :
                        'pending';
                if (sale.status !== newStatus) {
                    await salesCol.updateOne({ _id: sale._id }, {
                        $set: {
                            status: newStatus,
                            webhookVerified: true,
                            updatedAt: new Date(),
                            'paymentDetails.paymentId': paymentId,
                            'paymentDetails.status': mpPayment.status
                        }
                    });
                    if (newStatus === 'approved') {
                        await handleDelivery(sale._id.toString());
                    }
                }
                return res.json({ success: true });
            }
            case 'stripe':
            case 'sandstripe':
            case 'teststripe': {
                const Stripe = (await Promise.resolve().then(() => __importStar(require('stripe')))).default;
                const isTest = gateway === 'sandstripe' || gateway === 'teststripe';
                const sig = req.headers['stripe-signature'];
                if (!sig) {
                    return res.status(400).json({ success: false, message: 'Missing signature.' });
                }
                const rawBody = req.rawBody;
                if (!rawBody) {
                    logger_1.default.error('[Webhook Stripe] Raw body not available.');
                    return res.status(500).json({ success: false, message: 'Server configuration error.' });
                }
                let event;
                try {
                    event = JSON.parse(rawBody);
                }
                catch (err) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON.' });
                }
                const saleId = event.data?.object?.metadata?.saleId || event.data?.object?.client_reference_id;
                if (!saleId) {
                    return res.json({ success: true });
                }
                const sale = await salesCol.findOne({ _id: new mongodb_1.ObjectId(saleId) });
                if (!sale) {
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }
                const tenant = await tenantsCol.findOne({ _id: new mongodb_1.ObjectId(sale.tenantId) });
                if (!tenant) {
                    return res.status(404).json({ success: false, message: 'Tenant not found.' });
                }
                const stripeSettings = tenant.paymentIntegrations?.stripe;
                const webhookSecret = isTest ? stripeSettings?.test_webhook_secret : stripeSettings?.live_webhook_secret;
                const secretKey = isTest ? stripeSettings?.test_secret_key : stripeSettings?.live_secret_key;
                if (!secretKey) {
                    return res.status(500).json({ success: false, message: 'Stripe not configured.' });
                }
                const stripe = new Stripe(secretKey, { apiVersion: '2025-09-30.clover' });
                if (webhookSecret) {
                    try {
                        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
                    }
                    catch (err) {
                        logger_1.default.error(`[Webhook Stripe] Signature validation failed: ${err.message}`);
                        return res.status(400).json({ success: false, message: 'Invalid signature.' });
                    }
                }
                logger_1.default.info(`[Webhook Stripe] Event type: ${event.type} for sale ${sale._id}`);
                let newStatus = sale.status;
                if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
                    newStatus = 'approved';
                }
                else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
                    newStatus = 'failed';
                }
                if (sale.status !== newStatus) {
                    await salesCol.updateOne({ _id: sale._id }, {
                        $set: {
                            status: newStatus,
                            webhookVerified: true,
                            updatedAt: new Date()
                        }
                    });
                    if (newStatus === 'approved') {
                        await handleDelivery(sale._id.toString());
                    }
                }
                return res.json({ success: true });
            }
            case 'pushinpay':
            case 'sandpushinpay': {
                const isSandbox = gateway === 'sandpushinpay';
                logger_1.default.info(`Processing Tenant PushinPay webhook in ${isSandbox ? 'Sandbox' : 'Production'} mode...`);
                const { payment_id, external_reference, status } = body;
                if (!payment_id || !external_reference) {
                    logger_1.default.info("[Webhook PushinPay] Missing required fields.");
                    return res.status(400).json({ success: false, message: 'Missing required fields.' });
                }
                const sale = await salesCol.findOne({ _id: new mongodb_1.ObjectId(external_reference) });
                if (!sale) {
                    logger_1.default.error(`[Webhook PushinPay] Sale not found: ${external_reference}`);
                    return res.status(404).json({ success: false, message: 'Sale not found.' });
                }
                const tenant = await tenantsCol.findOne({ _id: new mongodb_1.ObjectId(sale.tenantId) });
                if (!tenant) {
                    logger_1.default.error(`[Webhook PushinPay] Tenant not found: ${sale.tenantId}`);
                    return res.status(404).json({ success: false, message: 'Tenant not found.' });
                }
                logger_1.default.info(`[Webhook PushinPay] Payment status: ${status} for sale ${sale._id}`);
                const newStatus = status === 'paid' || status === 'approved' ? 'approved' :
                    status === 'rejected' || status === 'cancelled' ? 'failed' :
                        'pending';
                if (sale.status !== newStatus) {
                    await salesCol.updateOne({ _id: sale._id }, {
                        $set: {
                            status: newStatus,
                            webhookVerified: true,
                            updatedAt: new Date()
                        }
                    });
                    if (newStatus === 'approved') {
                        await handleDelivery(sale._id.toString());
                    }
                }
                return res.json({ success: true });
            }
            default:
                logger_1.default.warn(`[Webhook] Gateway '${gateway}' not supported.`);
                return res.status(400).json({ success: false, message: 'Gateway not supported' });
        }
    }
    catch (error) {
        logger_1.default.error('[Webhook] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
// Support both old and new URL formats
router.post('/api/webhook/:username/:gateway', handleWebhook);
router.post('/:username/webhook/:gateway', handleWebhook);
async function handleDelivery(saleId) {
    logger_1.default.info(`[Delivery] Triggering delivery for sale ${saleId}`);
    try {
        const db = (await database_1.default).db('vematize');
        const sale = await db.collection('sales').findOne({ _id: new mongodb_1.ObjectId(saleId) });
        if (!sale)
            return;
        if (sale.discordThreadId) {
            await (0, delivery_service_1.deliverProductDiscord)(sale);
        }
        else if (sale.telegramChatId) {
            await (0, delivery_service_1.deliverProductTelegram)(sale);
        }
    }
    catch (e) {
        logger_1.default.error(`[Delivery] Failed to deliver for sale ${saleId}:`, e);
    }
}
exports.default = router;
