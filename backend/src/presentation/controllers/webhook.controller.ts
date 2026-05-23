import { Controller, Post, Req, Res, Body, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../../application/services/webhook.service';
import { DeliveryService } from '../../application/services/delivery.service';

@Controller('api/webhook')
export class WebhookController {
  private readonly internalSecret: string;

  constructor(
    private readonly webhookService: WebhookService,
    private readonly deliveryService: DeliveryService,
    private readonly config: ConfigService,
  ) {
    this.internalSecret = this.config.getOrThrow<string>('INTERNAL_SECRET');
  }

  @Post('mercadopago')
  async mercadopago(@Req() req: Request, @Res() res: Response) {
    console.log('[Debug] Endpoint webhook MercadoPago acionado');
    try {
      await this.webhookService.processMercadoPago(req.body, req.headers, req.query);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[Webhook MP] Erro:', error?.message);
      return res.status(500).json({ success: false, message: error?.message });
    }
  }

  @Post('efi')
  async efi(@Req() req: Request, @Res() res: Response) {
    console.log('[Debug] Endpoint webhook Efi acionado');
    try {
      await this.webhookService.processEfi(req.body, req.headers);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[Webhook Efí] Erro:', error?.message);
      return res.status(500).json({ success: false, message: error?.message });
    }
  }

  @Post('internal-deliver')
  async internalDeliver(@Req() req: Request, @Body() body: { saleId: string }, @Res() res: Response) {
    const secret = req.headers['x-internal-secret'];
    if (!secret || secret !== this.internalSecret) {
      console.log('[Debug] Tentativa de acesso nao autorizado ao endpoint interno de entrega');
      throw new UnauthorizedException('Acesso nao autorizado');
    }
    console.log(`[Debug] Endpoint interno de entrega acionado para saleId: ${body.saleId}`);
    try {
      await this.deliveryService.deliver(body.saleId);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[Internal Deliver] Erro ao processar entrega:', error?.message);
      return res.status(500).json({ success: false, message: 'Erro interno ao processar entrega' });
    }
  }
}
