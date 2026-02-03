import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import { telegramService } from '../services/telegram.service';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { env } from '../config/env';

const router = Router();

// Rota placeholder para configurações de bot (implementar futuramente)
router.get('/bots/config', async (req: Request, res: Response) => {
  logger.info('Bot config requested');
  res.json({ success: true, message: 'Bot config endpoint' });
});

// ==========================================
// DISCORD ROUTES
// ==========================================

// Test Discord Token
router.post('/discord/test-token', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.body;

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'Token não fornecido.' });
    }

    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (response.ok) {
      const botData = await response.json();
      return res.json({
        success: true,
        message: `Conexão bem-sucedida! Bot: ${botData.username}#${botData.discriminator || '0000'}`,
        data: {
          id: botData.id,
          username: botData.username,
          discriminator: botData.discriminator,
          avatar: botData.avatar,
        },
      });
    } else {
      const error = await response.json().catch(() => ({ message: 'Token inválido' }));
      return res.status(response.status).json({
        success: false,
        message: error.message || 'Token inválido ou expirado.',
      });
    }
  } catch (error: any) {
    logger.error('[Discord Test] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao testar conexão.',
    });
  }
});

// Get Interactions URL
router.post('/discord/get-interactions-url', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Missing tenantId' });

    const db = (await clientPromise).db('vematize');
    const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantId) });

    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    let token = tenant.discordInteractionsToken;

    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await db.collection('tenants').updateOne(
        { _id: new ObjectId(tenantId) },
        { $set: { discordInteractionsToken: token } }
      );
    }

    const interactionsUrl = `${env.BASE_URL}/api/v1/discord/interactions/${token}`;
    return res.json({ success: true, interactionsUrl });

  } catch (error: any) {
    logger.error('[Discord URL] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Regenerate Interactions Token
router.post('/discord/regenerate-token', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Missing tenantId' });

    const token = crypto.randomBytes(32).toString('hex');
    const db = (await clientPromise).db('vematize');

    await db.collection('tenants').updateOne(
      { _id: new ObjectId(tenantId) },
      { $set: { discordInteractionsToken: token } }
    );

    const interactionsUrl = `${env.BASE_URL}/api/v1/discord/interactions/${token}`;
    return res.json({ success: true, interactionsUrl });

  } catch (error: any) {
    logger.error('[Discord Regenerate] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ==========================================
// TELEGRAM ROUTES
// ==========================================

router.post('/telegram/configure', async (req: Request, res: Response) => {
  try {
    const { botToken, tenantId } = req.body;

    if (!botToken || !tenantId) {
      return res.status(400).json({ success: false, message: 'Missing botToken or tenantId' });
    }

    await telegramService.setWebhook(botToken, tenantId);

    res.json({ success: true, message: 'Webhook configured successfully' });
  } catch (error) {
    logger.error('Error configuring Telegram webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to configure webhook' });
  }
});

router.get('/telegram/webhook-info', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.query;

    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing botToken' });
    }

    const info = await telegramService.getWebhookInfo(botToken);

    res.json({ success: true, webhookInfo: info });
  } catch (error) {
    logger.error('Error getting webhook info:', error);
    res.status(500).json({ success: false, message: 'Failed to get webhook info' });
  }
});

router.delete('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.body;

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'Missing botToken' });
    }

    await telegramService.deleteWebhook(botToken);

    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({ success: false, message: 'Failed to delete webhook' });
  }
});

export default router;


