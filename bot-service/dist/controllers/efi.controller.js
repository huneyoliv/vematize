"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.efiController = exports.EfiController = void 0;
const efi_service_1 = require("../services/efi.service");
const logger_1 = __importDefault(require("../utils/logger"));
class EfiController {
    async createPlan(req, res) {
        try {
            const { tenantId, name, interval, price, repeats } = req.body;
            // Validate inputs
            if (!tenantId || !name || !interval || !price) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const plan = await efi_service_1.efiService.createPlan(tenantId, name, interval, price, repeats);
            res.json({ success: true, data: { planId: plan.data?.plan_id, ...plan } });
        }
        catch (error) {
            logger_1.default.error('Error in createPlan controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
        }
    }
    async createSubscription(req, res) {
        try {
            const { tenantId, planId, customer, items, subscriptionId, paymentMethod } = req.body;
            console.log('[EfiController] Received createSubscription request:', { tenantId, planId, customer, items, subscriptionId, paymentMethod });
            if (!tenantId || !planId || !customer || !items) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const subscription = await efi_service_1.efiService.createSubscription(tenantId, planId, customer, items, subscriptionId, paymentMethod);
            // Extract relevant data for the frontend
            // The service now returns { ...subscription, payment: { ... } }
            const paymentData = subscription.payment?.data;
            const paymentUrl = paymentData?.payment_url || paymentData?.charge?.payment_url;
            const qrCode = paymentData?.pix?.qrcode;
            const qrCodeBase64 = paymentData?.pix?.qrcode_image;
            const efiSubscriptionId = subscription.data?.subscription_id;
            res.json({
                success: true,
                data: {
                    subscriptionId: efiSubscriptionId,
                    paymentUrl,
                    qrCode,
                    qrCodeBase64,
                    raw: subscription
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error in createSubscription controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
        }
    }
    async handleWebhook(req, res) {
        try {
            // Efí sends data in body
            await efi_service_1.efiService.handleWebhook(req.body);
            res.status(200).send();
        }
        catch (error) {
            logger_1.default.error('Error in handleWebhook controller:', error);
            res.status(500).json({ error: error.message });
        }
    }
    async registerWebhook(req, res) {
        try {
            const { tenantId, webhookUrl } = req.body;
            const result = await efi_service_1.efiService.registerWebhook(tenantId, webhookUrl);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in registerWebhook controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to register webhook' });
        }
    }
    async createPixCharge(req, res) {
        try {
            const { tenantId, customer, items, customId, expireSeconds } = req.body;
            if (!tenantId || !customer || !items) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const result = await efi_service_1.efiService.createPixCharge(tenantId, customer, items, customId, expireSeconds);
            // Extract QR Code data
            const qrCode = result.pix.qrcode;
            const qrCodeBase64 = result.pix.qrcode_image;
            res.json({
                success: true,
                data: {
                    txid: result.txid,
                    qrCode: qrCode,
                    qrCodeBase64: qrCodeBase64,
                    paymentUrl: result.payment_url
                }
            });
        }
        catch (error) {
            logger_1.default.error('Error in createPixCharge controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create Pix charge' });
        }
    }
    async getPixCharge(req, res) {
        try {
            const { txid } = req.params;
            const tenantId = req.query.tenantId;
            if (!tenantId || !txid) {
                return res.status(400).json({ success: false, message: 'Missing required fields: tenantId or txid' });
            }
            const result = await efi_service_1.efiService.getPixCharge(tenantId, txid);
            res.json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in getPixCharge controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to get Pix charge details' });
        }
    }
}
exports.EfiController = EfiController;
exports.efiController = new EfiController();
