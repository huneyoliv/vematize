/**
 * Vematize Bot Service - Main Server
 */

import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import clientPromise from './config/database';
import logger from './utils/logger';
import { generalLimiter } from './middleware/rate-limiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import dns from 'dns';

// Force IPv4 to avoid ENETUNREACH on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import healthRouter from './routes/health';
import telegramRouter from './routes/telegram';
import discordRouter from './routes/discord';
import botConfigRouter from './routes/bot-config';
import efiRouter from './routes/efi.routes';
import emailRouter from './routes/email.routes';

const app: Express = express();
app.disable('x-powered-by');
const PORT = env.PORT || 8080;


// Middleware condicional para ignorar rotas do Discord
const unless = (path: string, middleware: any) => {
  return (req: Request, res: Response, next: any) => {
    if (req.path.includes(path)) {
      return next();
    }
    return middleware(req, res, next);
  };
};

// Helmet e CORS (exceto para Discord Interactions que precisa ser limpo)
app.use(unless('/api/v1/discord/interactions', helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })));
app.use(unless('/api/v1/discord/interactions', cors({ origin: env.CORS_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-signature-ed25519', 'x-signature-timestamp'] })));

app.set('trust proxy', 1);

// Middleware removido: Limpeza agressiva de headers não é mais necessária e pode causar problemas.

// Body parsers normais
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf, encoding: BufferEncoding) => {
    // Para rotas Discord, salva o raw body também
    if (req.url && req.url.includes('/api/v1/discord/interactions')) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalLimiter);

app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', { method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms`, ip: req.ip, userAgent: req.headers['user-agent'] });
  });
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, service: 'vematize-bot-service', version: '1.0.0', status: 'running', environment: env.NODE_ENV, timestamp: new Date().toISOString(), endpoints: { health: '/health', telegram: '/api/v1/telegram', discord: '/api/v1/discord', botConfig: '/api/v1/bots' } });
});

import uploadRouter from './routes/upload';
import mediaRouter from './routes/media';
import webhookRouter from './routes/webhook';
import path from 'path';

// ...

app.use('/health', healthRouter);
app.use('/api/v1/telegram', telegramRouter);
app.use('/api/v1/discord', discordRouter);
import discordApiRouter from './routes/discord-api';

// ...

app.use('/api/v1/bots', botConfigRouter);
app.use('/api/v1/discord/api', discordApiRouter); // New route for frontend operations
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/media', mediaRouter);
import mercadoPagoRouter from './routes/mercadopago.routes';

// ...

app.use('/api/v1/bots', botConfigRouter);
app.use('/api/v1/discord/api', discordApiRouter); // New route for frontend operations
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/media', mediaRouter);
app.use('/api/v1/efi', efiRouter);
app.use('/api/v1/mercadopago', mercadoPagoRouter);
app.use('/api/v1/email', emailRouter);
app.use('/', webhookRouter);

// Serve uploaded files statically
app.use('/medias', express.static(path.join(process.cwd(), 'public', 'medias')));

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('🔗 Conectando ao MongoDB...');
    await clientPromise;
    logger.info('✅ MongoDB connection established');

    // Initialize background jobs
    const { startExpirationJob } = await import('./jobs/expiration.job');
    const { startCleanupJob } = await import('./jobs/cleanup.job');
    startExpirationJob();
    startCleanupJob();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Bot Service is running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Base URL: ${env.BASE_URL}`);
      logger.info(`🌐 CORS Origin: ${env.CORS_ORIGIN}`);
      if (env.NODE_ENV === 'development') {
        logger.info(`�� API Documentation: http://localhost:${PORT}/`);
        logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
      }
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      server.close(() => {
        logger.info('✅ HTTP server closed');
        clientPromise.then((client: any) => { client.close(); logger.info('✅ MongoDB connection closed'); process.exit(0); }).catch((err: any) => { logger.error('Error closing MongoDB connection:', err); process.exit(1); });
      });
      setTimeout(() => { logger.error('❌ Could not close connections in time, forcefully shutting down'); process.exit(1); }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason instanceof Error ? reason.message : reason, stack: reason instanceof Error ? reason.stack : undefined });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

startServer();

export default app;
