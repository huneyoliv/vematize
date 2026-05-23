import { Injectable } from '@nestjs/common';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { MercadoPagoService } from './mercadopago.service';
import { EfiService } from './efi.service';
import { DeliveryService } from './delivery.service';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookService {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly mpService: MercadoPagoService,
    private readonly efiService: EfiService,
    private readonly deliveryService: DeliveryService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async processMercadoPago(body: any, headers?: any, query?: any): Promise<void> {
    const xSignature = headers?.['x-signature'];
    const xRequestId = headers?.['x-request-id'];
    const settings = await this.settingsRepo.get();
    const secret = settings?.mercadopagoConfig?.webhook_secret;

    if (xSignature || xRequestId || secret) {
      if (!secret) throw new Error('webhook_secret nao configurado');
      if (!xSignature || !xRequestId) throw new Error('Assinatura do webhook ausente');

      const parts = xSignature.split(',');
      let ts = '';
      let v1 = '';
      for (const part of parts) {
        const [key, val] = part.split('=');
        if (key === 'ts') ts = val;
        if (key === 'v1') v1 = val;
      }
      const dataId = query?.['data.id'] || body?.data?.id || body?.id;
      if (!ts || !v1 || !dataId) throw new Error('Assinatura do webhook malformada');

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hash = createHmac('sha256', secret).update(manifest).digest('hex');
      if (hash !== v1) throw new Error('Assinatura do webhook inválida');
    }

    if (body.type !== 'payment' && body.topic !== 'payment') {
      if (!body.data?.id) return;
    }

    const paymentId = body.data?.id || body.id;
    if (!paymentId) return;

    let sale = await this.saleRepo.findByPaymentId(paymentId.toString());

    if (!sale) {
      sale = await this.saleRepo.findByExternalReference(paymentId.toString());
    }

    if (!sale) {
      console.error(`[Webhook MP] Sale não encontrada para payment ${paymentId}`);
      return;
    }

    const mpPayment = await this.mpService.getPaymentStatus(paymentId.toString());
    if (!mpPayment) return;

    const newStatus =
      mpPayment.status === 'approved'
        ? 'approved'
        : mpPayment.status === 'rejected' || mpPayment.status === 'cancelled'
          ? 'failed'
          : 'pending';

    if (sale.status !== newStatus) {
      await this.saleRepo.update(sale.id, {
        status: newStatus,
        webhookVerified: true,
        paymentDetails: {
          ...sale.paymentDetails,
          paymentId: paymentId.toString(),
          status: mpPayment.status,
        },
      });

      if (newStatus === 'approved') {
        await this.deliveryService.deliver(sale.id);
      } else if (newStatus === 'failed') {
        await this.releaseStockIfNeeded(sale.productId);
      }
    }
  }

  async processEfi(body: any, headers?: any): Promise<void> {
    if (headers) {
      const clientVerify = headers['x-ssl-client-verify'] || headers['ssl-client-verify'];
      if (clientVerify && clientVerify !== 'SUCCESS') {
        throw new Error('Falha na validação mTLS da Efí');
      }
    }

    const pix = body.pix;
    if (!pix || !Array.isArray(pix) || pix.length === 0) return;

    for (const pixItem of pix) {
      const txid = pixItem.txid;
      if (!txid) continue;

      const sale = await this.saleRepo.findByTxid(txid);
      if (!sale) {
        console.error(`[Webhook Efí] Sale não encontrada para txid ${txid}`);
        continue;
      }

      if (sale.status === 'approved') continue;

      try {
        const charge = await this.efiService.getPixCharge(txid);
        const isPaid = charge.status === 'CONCLUIDA';

        if (isPaid && sale.status !== 'approved') {
          await this.saleRepo.update(sale.id, {
            status: 'approved',
            webhookVerified: true,
            paymentDetails: {
              ...sale.paymentDetails,
              status: 'CONCLUIDA',
            },
          });

          await this.deliveryService.deliver(sale.id);
        }
      } catch (error: any) {
        console.error(`[Webhook Efí] Erro ao verificar cobrança ${txid}:`, error?.message);
      }
    }
  }

  private async releaseStockIfNeeded(productId: string) {
    const product = await this.productRepo.findById(productId);
    if (product && product.stock !== null && product.stock !== undefined) {
      await this.productRepo.releaseStock(productId, 1);
    }
  }
}
