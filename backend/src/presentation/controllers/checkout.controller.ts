import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService, CheckoutInput } from '../../application/services/checkout.service';

@Controller('api/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async create(@Body() body: CheckoutInput) {
    return this.checkoutService.createCheckout(body);
  }
}
