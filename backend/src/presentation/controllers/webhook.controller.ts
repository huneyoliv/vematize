import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from '../../application/services/webhook.service';

@Controller('api/webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('mercadopago')
  async mercadopago(@Req() req: Request, @Res() res: Response) {
    try {
      await this.webhookService.processMercadoPago(req.body);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[Webhook MP] Erro:', error?.message);
      return res.status(500).json({ success: false, message: error?.message });
    }
  }

  @Post('efi')
  async efi(@Req() req: Request, @Res() res: Response) {
    try {
      await this.webhookService.processEfi(req.body);
      return res.json({ success: true });
    } catch (error: any) {
      console.error('[Webhook Efí] Erro:', error?.message);
      return res.status(500).json({ success: false, message: error?.message });
    }
  }
}
