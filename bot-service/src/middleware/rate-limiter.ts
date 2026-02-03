import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Rate limiter geral
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Muitas requisições. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para webhooks (mais permissivo)
export const webhookLimiter = rateLimit({
  windowMs: 60000, // 1 minuto
  max: 200, // 200 requisições por minuto
  message: 'Rate limit excedido para webhook.',
  standardHeaders: true,
  legacyHeaders: false,
});


