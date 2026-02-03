"use strict";
/**
 * Vematize Bot Service - Main Server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const database_1 = __importDefault(require("./config/database"));
const logger_1 = __importDefault(require("./utils/logger"));
const rate_limiter_1 = require("./middleware/rate-limiter");
const error_handler_1 = require("./middleware/error-handler");
const dns_1 = __importDefault(require("dns"));
// Force IPv4 to avoid ENETUNREACH on IPv6
if (dns_1.default.setDefaultResultOrder) {
    dns_1.default.setDefaultResultOrder('ipv4first');
}
const health_1 = __importDefault(require("./routes/health"));
const telegram_1 = __importDefault(require("./routes/telegram"));
const discord_1 = __importDefault(require("./routes/discord"));
const bot_config_1 = __importDefault(require("./routes/bot-config"));
const efi_routes_1 = __importDefault(require("./routes/efi.routes"));
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const app = (0, express_1.default)();
app.disable('x-powered-by');
const PORT = env_1.env.PORT || 8080;
// Middleware condicional para ignorar rotas do Discord
const unless = (path, middleware) => {
    return (req, res, next) => {
        if (req.path.includes(path)) {
            return next();
        }
        return middleware(req, res, next);
    };
};
// Helmet e CORS (exceto para Discord Interactions que precisa ser limpo)
app.use(unless('/api/v1/discord/interactions', (0, helmet_1.default)({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })));
app.use(unless('/api/v1/discord/interactions', (0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-signature-ed25519', 'x-signature-timestamp'] })));
app.set('trust proxy', 1);
// Middleware removido: Limpeza agressiva de headers não é mais necessária e pode causar problemas.
// Body parsers normais
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        // Para rotas Discord, salva o raw body também
        if (req.url && req.url.includes('/api/v1/discord/interactions')) {
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(rate_limiter_1.generalLimiter);
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.default.info('HTTP Request', { method: req.method, path: req.path, status: res.statusCode, duration: `${duration}ms`, ip: req.ip, userAgent: req.headers['user-agent'] });
    });
    next();
});
app.get('/', (req, res) => {
    res.json({ success: true, service: 'vematize-bot-service', version: '1.0.0', status: 'running', environment: env_1.env.NODE_ENV, timestamp: new Date().toISOString(), endpoints: { health: '/health', telegram: '/api/v1/telegram', discord: '/api/v1/discord', botConfig: '/api/v1/bots' } });
});
const upload_1 = __importDefault(require("./routes/upload"));
const media_1 = __importDefault(require("./routes/media"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const path_1 = __importDefault(require("path"));
// ...
app.use('/health', health_1.default);
app.use('/api/v1/telegram', telegram_1.default);
app.use('/api/v1/discord', discord_1.default);
const discord_api_1 = __importDefault(require("./routes/discord-api"));
// ...
app.use('/api/v1/bots', bot_config_1.default);
app.use('/api/v1/discord/api', discord_api_1.default); // New route for frontend operations
app.use('/api/v1/upload', upload_1.default);
app.use('/api/v1/media', media_1.default);
const mercadopago_routes_1 = __importDefault(require("./routes/mercadopago.routes"));
// ...
app.use('/api/v1/bots', bot_config_1.default);
app.use('/api/v1/discord/api', discord_api_1.default); // New route for frontend operations
app.use('/api/v1/upload', upload_1.default);
app.use('/api/v1/media', media_1.default);
app.use('/api/v1/efi', efi_routes_1.default);
app.use('/api/v1/mercadopago', mercadopago_routes_1.default);
app.use('/api/v1/email', email_routes_1.default);
app.use('/', webhook_1.default);
// Serve uploaded files statically
app.use('/medias', express_1.default.static(path_1.default.join(process.cwd(), 'public', 'medias')));
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
async function startServer() {
    try {
        logger_1.default.info('🔗 Conectando ao MongoDB...');
        await database_1.default;
        logger_1.default.info('✅ MongoDB connection established');
        // Initialize background jobs
        const { startExpirationJob } = await Promise.resolve().then(() => __importStar(require('./jobs/expiration.job')));
        const { startCleanupJob } = await Promise.resolve().then(() => __importStar(require('./jobs/cleanup.job')));
        startExpirationJob();
        startCleanupJob();
        const server = app.listen(PORT, () => {
            logger_1.default.info(`🚀 Bot Service is running on port ${PORT}`);
            logger_1.default.info(`📍 Environment: ${env_1.env.NODE_ENV}`);
            logger_1.default.info(`🔗 Base URL: ${env_1.env.BASE_URL}`);
            logger_1.default.info(`🌐 CORS Origin: ${env_1.env.CORS_ORIGIN}`);
            if (env_1.env.NODE_ENV === 'development') {
                logger_1.default.info(`�� API Documentation: http://localhost:${PORT}/`);
                logger_1.default.info(`❤️  Health Check: http://localhost:${PORT}/health`);
            }
        });
        const gracefulShutdown = (signal) => {
            logger_1.default.info(`\n🛑 Received ${signal}, starting graceful shutdown...`);
            server.close(() => {
                logger_1.default.info('✅ HTTP server closed');
                database_1.default.then((client) => { client.close(); logger_1.default.info('✅ MongoDB connection closed'); process.exit(0); }).catch((err) => { logger_1.default.error('Error closing MongoDB connection:', err); process.exit(1); });
            });
            setTimeout(() => { logger_1.default.error('❌ Could not close connections in time, forcefully shutting down'); process.exit(1); }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        logger_1.default.error('❌ Failed to start server:', { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
        process.exit(1);
    }
}
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled Promise Rejection:', { reason: reason instanceof Error ? reason.message : reason, stack: reason instanceof Error ? reason.stack : undefined });
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    process.exit(1);
});
startServer();
exports.default = app;
