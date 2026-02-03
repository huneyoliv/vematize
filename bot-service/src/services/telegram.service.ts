import { Telegraf } from 'telegraf';
import logger from '../utils/logger';
import { env } from '../config/env';

export class TelegramService {
    async setWebhook(botToken: string, tenantId: string): Promise<boolean> {
        try {
            const bot = new Telegraf(botToken);
            // Construct webhook URL pointing to Bot Service API
            // The Bot Service route is /api/v1/telegram/webhook?token=...
            const webhookUrl = `${env.BASE_URL}/api/v1/telegram/webhook?token=${botToken}`;

            await bot.telegram.setWebhook(webhookUrl);
            logger.info(`Webhook set for tenant ${tenantId} at ${webhookUrl}`);
            return true;
        } catch (error) {
            logger.error('Error setting Telegram webhook:', error);
            throw error;
        }
    }

    async getWebhookInfo(botToken: string) {
        try {
            const bot = new Telegraf(botToken);
            return await bot.telegram.getWebhookInfo();
        } catch (error) {
            logger.error('Error getting webhook info:', error);
            throw error;
        }
    }

    async deleteWebhook(botToken: string) {
        try {
            const bot = new Telegraf(botToken);
            return await bot.telegram.deleteWebhook();
        } catch (error) {
            logger.error('Error deleting webhook:', error);
            throw error;
        }
    }
}

export const telegramService = new TelegramService();
