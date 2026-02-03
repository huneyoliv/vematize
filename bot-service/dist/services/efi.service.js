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
exports.efiService = exports.EfiService = void 0;
const sdk_node_apis_efi_1 = __importDefault(require("sdk-node-apis-efi"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../utils/logger"));
const tenant_service_1 = require("./tenant.service");
class EfiService {
    async getEfiInstance(tenantId) {
        let config;
        if (tenantId === 'global') {
            const { default: clientPromise } = await Promise.resolve().then(() => __importStar(require('../config/database')));
            const client = await clientPromise;
            const db = client.db('vematize');
            // @ts-ignore
            const settings = await db.collection('settings').findOne({ _id: 'global' });
            if (!settings || !settings.paymentIntegrations?.efi) {
                throw new Error('Global Efí integration not configured');
            }
            config = settings.paymentIntegrations.efi;
        }
        else {
            const tenant = await tenant_service_1.tenantService.getTenantById(tenantId);
            if (!tenant || !tenant.paymentIntegrations?.efi) {
                throw new Error('Efí integration not configured for this tenant');
            }
            config = tenant.paymentIntegrations.efi;
        }
        const isProd = config.mode === 'production';
        const options = {
            sandbox: !isProd,
            client_id: (isProd ? config.production_client_id : config.sandbox_client_id),
            client_secret: (isProd ? config.production_client_secret : config.sandbox_client_secret),
            certificate: config.certificate,
            pem: true,
        };
        // Validate certificate
        if (!options.certificate || !fs_1.default.existsSync(options.certificate)) {
            throw new Error(`Certificate file not found at: ${options.certificate}`);
        }
        return new sdk_node_apis_efi_1.default(options);
    }
    async createPlan(tenantId, name, interval, price, repeats) {
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
        }
        catch (error) {
            logger_1.default.error('Error creating Efí plan:', error);
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
    async createPixCharge(tenantId, customer, items, customId, expireSeconds = 600) {
        try {
            const efi = await this.getEfiInstance(tenantId);
            // Calculate total value
            const totalValue = items.reduce((acc, item) => acc + (item.value * item.amount), 0) / 100;
            // Get Pix Key
            let pixKey;
            if (tenantId === 'global') {
                const { default: clientPromise } = await Promise.resolve().then(() => __importStar(require('../config/database')));
                const client = await clientPromise;
                const db = client.db('vematize');
                // @ts-ignore
                const settings = await db.collection('settings').findOne({ _id: 'global' });
                pixKey = settings?.paymentIntegrations?.efi?.pix_key;
            }
            else {
                const tenant = await tenant_service_1.tenantService.getTenantById(tenantId);
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
        }
        catch (error) {
            logger_1.default.error('Error creating Efí Pix charge:', error);
            throw error;
        }
    }
    async getPixCharge(tenantId, txid) {
        try {
            const efi = await this.getEfiInstance(tenantId);
            const params = {
                txid: txid
            };
            const response = await efi.pixDetailCharge(params);
            return response;
        }
        catch (error) {
            logger_1.default.error('Error getting Efí Pix charge details:', error);
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
    async createSubscription(tenantId, planId, customer, items, customId, paymentMethod = 'link') {
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
        }
        catch (error) {
            logger_1.default.error('Error creating Efí subscription:', error);
            if (error.response) {
                logger_1.default.error('Efí Response Data:', error.response.data);
            }
            logger_1.default.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    }
    async handleWebhook(data) {
        logger_1.default.info('Handling Efí webhook', data);
        // Verify signature if needed
        // Update local subscription status
    }
    async registerWebhook(tenantId, webhookUrl) {
        try {
            const efi = await this.getEfiInstance(tenantId);
            // Get Pix Key
            let pixKey;
            if (tenantId === 'global') {
                const { default: clientPromise } = await Promise.resolve().then(() => __importStar(require('../config/database')));
                const client = await clientPromise;
                const db = client.db('vematize');
                // @ts-ignore
                const settings = await db.collection('settings').findOne({ _id: 'global' });
                pixKey = settings?.paymentIntegrations?.efi?.pix_key;
            }
            else {
                const tenant = await tenant_service_1.tenantService.getTenantById(tenantId);
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
        }
        catch (error) {
            logger_1.default.error('Error registering Efí webhook:', error);
            throw error;
        }
    }
}
exports.EfiService = EfiService;
exports.efiService = new EfiService();
