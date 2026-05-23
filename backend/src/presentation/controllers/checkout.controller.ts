import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService, CheckoutInput } from '../../application/services/checkout.service';
import { Throttle } from '@nestjs/throttler';

@Controller('api/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async create(@Body() body: CheckoutInput) {
    console.log('[Debug] Post checkout acionado', { productId: body.productId, userId: body.userId });
    return this.checkoutService.createCheckout(body);
  }
}
