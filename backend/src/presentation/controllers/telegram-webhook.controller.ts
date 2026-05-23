import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramBotService } from '../../application/telegram/telegram-bot.service';

@Controller('api/telegram')
export class TelegramWebhookController {
  constructor(private readonly botService: TelegramBotService) {}

  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    const secretToken = process.env.TELEGRAM_SECRET_TOKEN || process.env.JWT_SECRET;
    const headerToken = req.headers['x-telegram-bot-api-secret-token'];
    console.log('[Debug] Telegram Webhook recebido', { hasHeader: !!headerToken });

    if (process.env.NODE_ENV === 'production') {
      if (!headerToken || headerToken !== secretToken) {
        console.log('[Debug] Telegram Webhook rejeitado: Token secreto invalido');
        return res.status(401).json({ error: 'Nao autorizado' });
      }
    }

    try {
      await this.botService.handleWebhookUpdate(req.body);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('[Debug] Telegram Webhook - Erro ao processar update:', error?.message);
      return res.status(500).json({ ok: false });
    }
  }
}
