import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramBotService } from '../../application/telegram/telegram-bot.service';

@Controller('api/telegram')
export class TelegramWebhookController {
  constructor(private readonly botService: TelegramBotService) {}

  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    try {
      await this.botService.handleWebhookUpdate(req.body);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('[Telegram Webhook] Erro:', error?.message);
      return res.status(500).json({ ok: false });
    }
  }
}
