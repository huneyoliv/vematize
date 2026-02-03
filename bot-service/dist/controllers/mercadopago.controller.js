"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mercadoPagoController = void 0;
const mercadopago_service_1 = require("../services/mercadopago.service");
const logger_1 = __importDefault(require("../utils/logger"));
class MercadoPagoController {
    async createSaasSubscription(req, res) {
        try {
            const { tenantId, plan, customer, backUrl, reason, externalReference } = req.body;
            if (!tenantId || !plan || !customer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const result = await mercadopago_service_1.mercadoPagoService.createSaasSubscription(tenantId, plan, customer, backUrl, reason, externalReference);
            res.json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in createSaasSubscription controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS subscription' });
        }
    }
    async createSaasPreference(req, res) {
        try {
            const { tenantId, items, payer, backUrls, externalReference, notificationUrl } = req.body;
            if (!tenantId || !items || !payer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const result = await mercadopago_service_1.mercadoPagoService.createSaasPreference(tenantId, items, payer, backUrls, externalReference, notificationUrl);
            res.json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in createSaasPreference controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS preference' });
        }
    }
    async createSaasPixPayment(req, res) {
        try {
            const { tenantId, transactionAmount, description, payer, externalReference, notificationUrl } = req.body;
            if (!tenantId || !transactionAmount || !payer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const result = await mercadopago_service_1.mercadoPagoService.createSaasPixPayment(tenantId, transactionAmount, description, payer, externalReference, notificationUrl);
            res.json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in createSaasPixPayment controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS Pix payment' });
        }
    }
    async getSaasPaymentStatus(req, res) {
        try {
            const { id } = req.params;
            const { tenantId } = req.query;
            if (!id || !tenantId) {
                return res.status(400).json({ success: false, message: 'Missing required fields (id or tenantId)' });
            }
            const result = await mercadopago_service_1.mercadoPagoService.getSaasPaymentStatus(tenantId, id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            logger_1.default.error('Error in getSaasPaymentStatus controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to get payment status' });
        }
    }
}
exports.mercadoPagoController = new MercadoPagoController();
