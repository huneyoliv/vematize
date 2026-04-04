import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { MercadoPagoService, PixPaymentResult } from './mercadopago.service';
import { EfiService, EfiPixResult } from './efi.service';

export interface ChargeResult {
  success: boolean;
  message: string;
  gateway: string;
  paymentId?: string;
  txid?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly mpService: MercadoPagoService,
    private readonly efiService: EfiService,
  ) {}

  async createCharge(
    productName: string,
    amount: number,
    saleId: string,
  ): Promise<ChargeResult> {
    const settings = await this.settingsRepo.get();
    const gateway = settings?.preferredPixGateway || settings?.activeGateway || 'mercadopago';

    if (gateway === 'efi') {
      const result = await this.efiService.createPixCharge(amount, productName, saleId);
      return {
        success: result.success,
        message: result.message,
        gateway: 'efi',
        txid: result.txid,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
      };
    }

    const result = await this.mpService.createPixPayment(productName, amount, saleId);
    return {
      success: result.success,
      message: result.message,
      gateway: 'mercadopago',
      paymentId: result.paymentId,
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
      ticketUrl: result.ticketUrl,
    };
  }
}
