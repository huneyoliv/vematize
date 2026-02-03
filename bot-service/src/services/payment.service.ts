import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Cart } from './cart.service';
import { Tenant } from './tenant.service';
import logger from '../utils/logger';
import QRCode from 'qrcode';

export interface PaymentResult {
    paymentId: string;
    status: string;
    qrCode: string; // Copy and paste code
    qrCodeBase64: string; // Image base64
    ticketUrl: string;
    qrCodeBuffer?: Buffer;
}

export class PaymentService {
    async createPayment(cart: Cart, tenant: Tenant): Promise<PaymentResult | null> {
        try {
            const mpSettings = tenant.paymentIntegrations?.mercadopago;

            if (!mpSettings) {
                logger.error('Tenant has no MercadoPago settings');
                return null;
            }

            const isProduction = mpSettings.mode === 'production';
            const accessToken = isProduction ? mpSettings.production_access_token : mpSettings.sandbox_access_token;

            if (!accessToken) {
                logger.error('Tenant has no MercadoPago access token');
                return null;
            }

            const client = new MercadoPagoConfig({ accessToken: accessToken });
            const payment = new Payment(client);

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
                logger.error('Invalid response from MercadoPago', response);
                return null;
            }

            const qrCode = response.point_of_interaction.transaction_data?.qr_code;
            const qrCodeBase64 = response.point_of_interaction.transaction_data?.qr_code_base64;
            const ticketUrl = response.point_of_interaction.transaction_data?.ticket_url;

            if (!qrCode || !qrCodeBase64) {
                logger.error('No QR Code in response');
                return null;
            }

            // Gerar Buffer da imagem do QR Code
            let qrCodeBuffer = await QRCode.toBuffer(qrCode, {
                errorCorrectionLevel: 'H', // Alto nível de correção para suportar logo
                margin: 1,
                width: 300
            });

            // TODO: Pegar URL do logo das configurações do Tenant
            const logoUrl = 'https://github.com/shadcn.png'; // Placeholder para teste

            if (logoUrl) {
                try {
                    const sharp = (await import('sharp')).default;

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
                } catch (err) {
                    logger.error('Error adding logo to QR Code:', err);
                    // Continua sem logo se der erro
                }
            }

            return {
                paymentId: response.id!.toString(),
                status: response.status!,
                qrCode,
                qrCodeBase64,
                ticketUrl: ticketUrl!,
                qrCodeBuffer // Novo campo
            };

        } catch (error) {
            logger.error('Error creating payment:', error);
            return null;
        }
    }
}

export const paymentService = new PaymentService();
