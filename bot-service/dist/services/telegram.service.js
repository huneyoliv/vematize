"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramService = exports.TelegramService = void 0;
const telegraf_1 = require("telegraf");
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = require("../config/env");
class TelegramService {
    async setWebhook(botToken, tenantId) {
        try {
            const bot = new telegraf_1.Telegraf(botToken);
            // Construct webhook URL pointing to Bot Service API
            // The Bot Service route is /api/v1/telegram/webhook?token=...
            const webhookUrl = `${env_1.env.BASE_URL}/api/v1/telegram/webhook?token=${botToken}`;
            await bot.telegram.setWebhook(webhookUrl);
            logger_1.default.info(`Webhook set for tenant ${tenantId} at ${webhookUrl}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error setting Telegram webhook:', error);
            throw error;
        }
    }
    async getWebhookInfo(botToken) {
        try {
            const bot = new telegraf_1.Telegraf(botToken);
            return await bot.telegram.getWebhookInfo();
        }
        catch (error) {
            logger_1.default.error('Error getting webhook info:', error);
            throw error;
        }
    }
    async deleteWebhook(botToken) {
        try {
            const bot = new telegraf_1.Telegraf(botToken);
            return await bot.telegram.deleteWebhook();
        }
        catch (error) {
            logger_1.default.error('Error deleting webhook:', error);
            throw error;
        }
    }
}
exports.TelegramService = TelegramService;
exports.telegramService = new TelegramService();
