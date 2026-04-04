import { Injectable, BadRequestException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { PaymentGatewayService, ChargeResult } from './payment-gateway.service';

export interface CheckoutInput {
  productId: string;
  userId: string;
  platform: 'telegram' | 'discord' | 'api';
  telegramChatId?: number;
  discordChannelId?: string;
  discordThreadId?: string;
  couponCode?: string;
}

export interface CheckoutResult {
  saleId: string;
  gateway: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  paymentId?: string;
  txid?: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly saleRepo: SaleRepository,
    private readonly userRepo: UserRepository,
    private readonly couponRepo: CouponRepository,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const product = await this.productRepo.findById(input.productId);
    if (!product) {
      throw new BadRequestException('Produto não encontrado.');
    }

    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      throw new BadRequestException('Produto sem estoque.');
    }

    let finalPrice = Number(product.price);
    if (
      product.discountPrice &&
      product.offerExpiresAt &&
      new Date(product.offerExpiresAt) > new Date()
    ) {
      finalPrice = Number(product.discountPrice);
    }

    if (input.couponCode) {
      const coupon = await this.couponRepo.findByCode(input.couponCode);
      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
        const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;
        if (notExpired && hasUses) {
          if (coupon.type === 'percentage') {
            finalPrice = finalPrice - (finalPrice * coupon.value / 100);
          } else {
            finalPrice = finalPrice - coupon.value;
          }
          if (finalPrice < 0) finalPrice = 0;
        }
      }
    }

    if (finalPrice <= 0) {
      throw new BadRequestException('Valor do produto deve ser maior que zero para pagamento.');
    }

    if (product.stock !== null && product.stock !== undefined) {
      const reserved = await this.productRepo.reserveStock(input.productId, 1);
      if (!reserved) {
        throw new BadRequestException('Estoque insuficiente.');
      }
    }

    const sale = await this.saleRepo.create({
      productId: input.productId,
      userId: input.userId,
      telegramChatId: input.telegramChatId,
      discordChannelId: input.discordChannelId,
      discordThreadId: input.discordThreadId,
      couponCode: input.couponCode,
      quantity: 1,
      totalPrice: finalPrice,
      status: 'pending',
      paymentGateway: 'pending',
      paymentDetails: {},
    });

    const charge = await this.paymentGateway.createCharge(
      product.name,
      finalPrice,
      sale.id,
    );

    if (!charge.success) {
      await this.saleRepo.update(sale.id, { status: 'failed' });
      if (product.stock !== null && product.stock !== undefined) {
        await this.productRepo.releaseStock(input.productId, 1);
      }
      throw new BadRequestException(charge.message);
    }

    await this.saleRepo.update(sale.id, {
      paymentGateway: charge.gateway,
      paymentDetails: {
        paymentId: charge.paymentId,
        txid: charge.txid,
        qrCode: charge.qrCode,
        qrCodeBase64: charge.qrCodeBase64,
        ticketUrl: charge.ticketUrl,
      },
    });

    return {
      saleId: sale.id,
      gateway: charge.gateway,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      ticketUrl: charge.ticketUrl,
      paymentId: charge.paymentId,
      txid: charge.txid,
    };
  }
}
