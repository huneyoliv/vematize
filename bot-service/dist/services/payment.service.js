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
exports.paymentService = exports.PaymentService = void 0;
const mercadopago_1 = require("mercadopago");
const logger_1 = __importDefault(require("../utils/logger"));
const qrcode_1 = __importDefault(require("qrcode"));
class PaymentService {
    async createPayment(cart, tenant) {
        try {
            const mpSettings = tenant.paymentIntegrations?.mercadopago;
            if (!mpSettings) {
                logger_1.default.error('Tenant has no MercadoPago settings');
                return null;
            }
            const isProduction = mpSettings.mode === 'production';
            const accessToken = isProduction ? mpSettings.production_access_token : mpSettings.sandbox_access_token;
            if (!accessToken) {
                logger_1.default.error('Tenant has no MercadoPago access token');
                return null;
            }
            const client = new mercadopago_1.MercadoPagoConfig({ accessToken: accessToken });
            const payment = new mercadopago_1.Payment(client);
            const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const paymentData = {
                transaction_amount: totalAmount,
                description: `Pedido #${cart._id}`,
                payment_method_id: 'pix',
                payer: {
                    email: 'test_user_123@test.com' // Discord user email is not always available, using dummy for Pix
                },
                metadata: {
                    cart_id: cart._id?.toString(),
                    tenant_id: tenant._id.toString()
                }
            };
            const response = await payment.create({ body: paymentData });
            if (!response || !response.point_of_interaction) {
                logger_1.default.error('Invalid response from MercadoPago', response);
                return null;
            }
            const qrCode = response.point_of_interaction.transaction_data?.qr_code;
            const qrCodeBase64 = response.point_of_interaction.transaction_data?.qr_code_base64;
            const ticketUrl = response.point_of_interaction.transaction_data?.ticket_url;
            if (!qrCode || !qrCodeBase64) {
                logger_1.default.error('No QR Code in response');
                return null;
            }
            // Gerar Buffer da imagem do QR Code
            let qrCodeBuffer = await qrcode_1.default.toBuffer(qrCode, {
                errorCorrectionLevel: 'H', // Alto nível de correção para suportar logo
                margin: 1,
                width: 300
            });
            // TODO: Pegar URL do logo das configurações do Tenant
            const logoUrl = 'https://github.com/shadcn.png'; // Placeholder para teste
            if (logoUrl) {
                try {
                    const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
                    // Fetch do logo
                    const logoResponse = await fetch(logoUrl);
                    const logoBuffer = await logoResponse.arrayBuffer();
                    // Redimensionar logo para caber no centro (20% do tamanho do QR)
                    const logo = await sharp(Buffer.from(logoBuffer))
                        .resize(60, 60)
                        .toBuffer();
                    // Compor
                    qrCodeBuffer = await sharp(qrCodeBuffer)
                        .composite([{ input: logo, gravity: 'center' }])
                        .toBuffer();
                }
                catch (err) {
                    logger_1.default.error('Error adding logo to QR Code:', err);
                    // Continua sem logo se der erro
                }
            }
            return {
                paymentId: response.id.toString(),
                status: response.status,
                qrCode,
                qrCodeBase64,
                ticketUrl: ticketUrl,
                qrCodeBuffer // Novo campo
            };
        }
        catch (error) {
            logger_1.default.error('Error creating payment:', error);
            return null;
        }
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
