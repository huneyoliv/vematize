import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { createBotInstance } from '../services/telegram-bot';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const token = req.query.token as string;

  if (!token) {
    logger.warn('[Telegram Webhook] Token not provided in query params');
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const bot = createBotInstance(token);

    // Process the update
    await bot.handleUpdate(req.body);

    // Always return 200 OK to Telegram
    res.status(200).send('OK');
  } catch (error) {
    logger.error('[Telegram Webhook] Error processing update:', error);
    // Return 200 even on error to prevent Telegram from retrying endlessly
    res.status(200).send('OK');
  }
});

export default router;
