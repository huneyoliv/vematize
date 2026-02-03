"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
// Rate limiter geral
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Muitas requisições. Tente novamente mais tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiter para webhooks (mais permissivo)
exports.webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000, // 1 minuto
    max: 200, // 200 requisições por minuto
    message: 'Rate limit excedido para webhook.',
    standardHeaders: true,
    legacyHeaders: false,
});
