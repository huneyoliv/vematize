"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
// Carrega variáveis de ambiente
(0, dotenv_1.config)();
// Schema de validação
const envSchema = zod_1.z.object({
    // Server
    PORT: zod_1.z.string().default('8080'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // URLs
    BASE_URL: zod_1.z.string().default('https://api.swaptune.me'),
    CORS_ORIGIN: zod_1.z.string().default('https://swaptune.me'),
    // MongoDB
    MONGODB_URI: zod_1.z.string(),
    // Security
    API_SECRET_KEY: zod_1.z.string().optional(),
    CRON_SECRET: zod_1.z.string().optional(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('60000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default('100'),
    // Logging
    LOG_LEVEL: zod_1.z.string().default('info'),
    // Email (Brevo)
    BREVO_API_KEY: zod_1.z.string().optional(),
    BREVO_SENDER_EMAIL: zod_1.z.string().optional(),
    BREVO_SENDER_NAME: zod_1.z.string().default('Vematize'),
});
// Valida e exporta
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}
exports.env = {
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
