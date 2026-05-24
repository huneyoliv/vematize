import { Injectable, BadRequestException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { PaymentGatewayService } from './payment-gateway.service';

export interface CheckoutInput {
  productId: string;
  userId: string;
  platform: 'telegram' | 'discord' | 'api';
  telegramChatId?: number;
  discordChannelId?: string;
  discordThreadId?: string;
  couponCode?: string;
  onExpired?: (saleId: string) => Promise<void>;
}

export interface CheckoutResult {
  saleId: string;
  gateway: string;
  totalPrice: number;
  qrCode?: string;
  qrCodeBase64?: string;
  qrCodeWithLogo?: string;
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
    private readonly settingsRepo: SettingsRepository,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new BadRequestException('Usuario nao encontrado.');

    const product = await this.productRepo.findById(input.productId);
    if (!product) throw new BadRequestException('Produto nao encontrado.');

    if (product.type === 'subscription' && input.platform !== 'api') {
      const allowsTelegram = !!product.telegramGroupId || !!product.isTelegramGroupAccess;
      const allowsDiscord = !!product.discordSubscriptionRoleId;

      if (input.platform === 'telegram' && !allowsTelegram) {
        throw new BadRequestException('Assinatura não disponível para Telegram.');
      }
      if (input.platform === 'discord' && !allowsDiscord) {
        throw new BadRequestException('Assinatura não disponível para Discord.');
      }
    }

    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      throw new BadRequestException('Produto sem estoque.');
    }

    const isOfferActive =
      product.discountPrice &&
      product.offerExpiresAt &&
      new Date(product.offerExpiresAt) > new Date();

    let finalPrice = isOfferActive ? Number(product.discountPrice) : Number(product.price);

    if (input.couponCode) {
      const coupon = await this.couponRepo.findByCode(input.couponCode);
      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
        const hasUses = !coupon.maxUses || coupon.currentUses < coupon.maxUses;

        if (coupon.limitToOneUsePerUser) {
          const previousUse = await this.saleRepo.findByCouponAndUser(input.couponCode, input.userId);
          if (previousUse) {
            throw new BadRequestException('Você já utilizou este cupom anteriormente.');
          }
        }

        if (notExpired && hasUses) {
          finalPrice =
            coupon.type === 'percentage'
              ? finalPrice - (finalPrice * coupon.value) / 100
              : finalPrice - coupon.value;
          if (finalPrice < 0) finalPrice = 0;
        }
      }
    }

    if (finalPrice <= 0) {
      throw new BadRequestException('Valor do produto deve ser maior que zero para pagamento.');
    }

    if (product.stock !== null && product.stock !== undefined) {
      const reserved = await this.productRepo.reserveStock(input.productId, 1);
      if (!reserved) throw new BadRequestException('Estoque insuficiente.');
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

    const charge = await this.paymentGateway.createCharge(product.name, finalPrice, sale.id);

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

    let qrCodeWithLogo: string | undefined;
    if (charge.qrCode) {
      qrCodeWithLogo = await this.generateQrCodeWithLogo(charge.qrCode);
    }

    this.scheduleExpiration(sale.id, input);

    return {
      saleId: sale.id,
      gateway: charge.gateway,
      totalPrice: finalPrice,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      qrCodeWithLogo,
      ticketUrl: charge.ticketUrl,
      paymentId: charge.paymentId,
      txid: charge.txid,
    };
  }

  private async generateQrCodeWithLogo(pixCode: string): Promise<string> {
    try {
      const settings = await this.settingsRepo.get();
      const logoUrl = settings?.logoUrl;

      const qrDataUrl = await QRCode.toDataURL(pixCode, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: { dark: '#000000', light: '#ffffff' },
      });

      if (!logoUrl) return qrDataUrl;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Jimp = require('jimp');
      const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      
      const qrJimp = await Jimp.read(qrBuffer);
      const logoJimp = await Jimp.read(logoUrl).catch(() => null);

      if (!logoJimp) return qrDataUrl;

      const qrWidth = qrJimp.bitmap.width;
      const logoSize = Math.floor(qrWidth * 0.2);
      logoJimp.resize(logoSize, logoSize);

      const x = (qrWidth - logoSize) / 2;
      const y = (qrWidth - logoSize) / 2;

      const padding = 6;
      const bgSize = logoSize + padding * 2;
      const whiteBg = new Jimp(bgSize, bgSize, 0xFFFFFFFF);

      qrJimp.composite(whiteBg, x - padding, y - padding);
      qrJimp.composite(logoJimp, x, y);

      return await qrJimp.getBase64Async(Jimp.MIME_PNG);
    } catch (err: any) {
      console.error('[CheckoutService] Erro ao gerar QR Code com Jimp:', err?.message);
      const qrDataUrl = await QRCode.toDataURL(pixCode, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
      });
      return qrDataUrl;
    }
  }

  private scheduleExpiration(saleId: string, input: CheckoutInput): void {
    const THIRTY_MINUTES = 30 * 60 * 1000;

    setTimeout(async () => {
      const sale = await this.saleRepo.findById(saleId);
      if (!sale || sale.status !== 'pending') return;

      await this.saleRepo.update(saleId, { status: 'cancelled' });

      if (input.onExpired) {
        await input.onExpired(saleId).catch(() => {});
      }
    }, THIRTY_MINUTES);
  }
}
