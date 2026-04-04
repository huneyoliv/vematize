import { Injectable } from '@nestjs/common';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';

@Injectable()
export class DeliveryService {
  private telegramDelivery: any = null;
  private discordDelivery: any = null;

  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly userRepo: UserRepository,
    private readonly botConfigRepo: BotConfigRepository,
  ) {}

  setTelegramDelivery(service: any) {
    this.telegramDelivery = service;
  }

  setDiscordDelivery(service: any) {
    this.discordDelivery = service;
  }

  async deliver(saleId: string): Promise<void> {
    const sale = await this.saleRepo.findById(saleId);
    if (!sale) {
      console.error(`[Delivery] Sale ${saleId} não encontrada`);
      return;
    }

    const product = await this.productRepo.findById(sale.productId);
    if (!product) {
      console.error(`[Delivery] Produto ${sale.productId} não encontrado`);
      return;
    }

    try {
      if (sale.discordThreadId && this.discordDelivery) {
        await this.discordDelivery.deliver(sale, product);
      } else if (sale.telegramChatId && this.telegramDelivery) {
        await this.telegramDelivery.deliver(sale, product);
      } else {
        console.log(`[Delivery] Nenhuma plataforma de entrega para sale ${saleId}`);
      }
    } catch (error: any) {
      console.error(`[Delivery] Erro ao entregar sale ${saleId}:`, error?.message);
    }
  }
}
