import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import clientPromise from '../config/database';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Testa conexão com MongoDB
    const client = await clientPromise;
    const admin = client.db().admin();
    await admin.ping();

    res.json({
      status: 'ok',
      service: 'vematize-bot-service',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected'
      }
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      service: 'vematize-bot-service',
      error: error.message,
      database: {
        status: 'disconnected'
      }
    });
  }
});

export default router;


