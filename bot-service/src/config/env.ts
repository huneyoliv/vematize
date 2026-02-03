import { config } from 'dotenv';
import { z } from 'zod';

// Carrega variáveis de ambiente
config();

// Schema de validação
const envSchema = z.object({
  // Server
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // URLs
  BASE_URL: z.string().default('https://api.swaptune.me'),
  CORS_ORIGIN: z.string().default('https://swaptune.me'),

  // MongoDB
  MONGODB_URI: z.string(),

  // Security
  API_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Logging
  LOG_LEVEL: z.string().default('info'),

  // Email (Brevo)
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().default('Vematize'),
});

// Valida e exporta
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  PORT: parseInt(parsed.data.PORT, 10),
  NODE_ENV: parsed.data.NODE_ENV,
  BASE_URL: parsed.data.BASE_URL,
  CORS_ORIGIN: parsed.data.CORS_ORIGIN,
  MONGODB_URI: parsed.data.MONGODB_URI,
  API_SECRET_KEY: parsed.data.API_SECRET_KEY || '',
  CRON_SECRET: parsed.data.CRON_SECRET || '',
  RATE_LIMIT_WINDOW_MS: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS, 10),
  LOG_LEVEL: parsed.data.LOG_LEVEL,
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  BREVO_API_KEY: parsed.data.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: parsed.data.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: parsed.data.BREVO_SENDER_NAME,
};


