import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';

export interface PixPaymentResult {
  success: boolean;
  message: string;
  paymentId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

@Injectable()
export class MercadoPagoService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  private async getConfig() {
    const settings = await this.settingsRepo.get();
    if (!settings?.mercadopagoConfig) {
      throw new Error('MercadoPago não configurado');
    }
    return settings.mercadopagoConfig;
  }

  async createPixPayment(
    productName: string,
    amount: number,
    saleId: string,
  ): Promise<PixPaymentResult> {
    const { MercadoPagoConfig, Payment } = await import('mercadopago');

    const config = await this.getConfig();
    const accessToken = config.production_access_token;

    if (!accessToken) {
      return { success: false, message: 'Access token do MercadoPago não configurado.' };
    }

    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    const payment = new Payment(client);

    const settings = await this.settingsRepo.get();
    const domain = process.env.DOMAIN || 'localhost';
    const isDev = domain === 'localhost' || process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? `http://localhost:${process.env.PORT || 3001}` : `https://${domain}`;
    const notificationUrl = `${baseUrl}/api/webhook/mercadopago`;

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30);

    const body = {
      transaction_amount: parseFloat(amount.toFixed(2)),
      description: productName,
      payment_method_id: 'pix',
      payer: {
        email: 'comprador@vematize.com',
        first_name: 'Comprador',
        last_name: 'Anônimo',
        identification: {
          type: 'CPF',
          number: '00000000000',
        },
      },
      notification_url: notificationUrl,
      external_reference: saleId,
      date_of_expiration: expirationDate.toISOString(),
    };

    try {
      const result = await payment.create({ body });

      if (!result.point_of_interaction?.transaction_data) {
        return { success: false, message: 'Dados do PIX não retornados pelo MercadoPago.' };
      }

      return {
        success: true,
        message: 'Pagamento PIX criado.',
        paymentId: result.id?.toString(),
        qrCode: result.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
        ticketUrl: result.point_of_interaction.transaction_data.ticket_url,
      };
    } catch (error: any) {
      console.error('[MercadoPago] Erro ao criar PIX:', error?.message);
      return { success: false, message: 'Erro ao criar pagamento PIX: ' + (error?.message || 'desconhecido') };
    }
  }

  async getPaymentStatus(paymentId: string) {
    const { MercadoPagoConfig, Payment } = await import('mercadopago');

    const config = await this.getConfig();
    const accessToken = config.production_access_token;

    if (!accessToken) throw new Error('Access token não configurado');

    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    const payment = new Payment(client);
    return payment.get({ id: paymentId });
  }
}
