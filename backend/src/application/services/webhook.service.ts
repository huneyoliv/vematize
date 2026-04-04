import { Injectable } from '@nestjs/common';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { MercadoPagoService } from './mercadopago.service';
import { EfiService } from './efi.service';
import { DeliveryService } from './delivery.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly mpService: MercadoPagoService,
    private readonly efiService: EfiService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async processMercadoPago(body: any): Promise<void> {
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

  async processEfi(body: any): Promise<void> {
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
