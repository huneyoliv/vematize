"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = __importDefault(require("../utils/logger"));
const telegram_bot_1 = require("../services/telegram-bot");
const router = (0, express_1.Router)();
router.post('/webhook', async (req, res) => {
    const token = req.query.token;
    if (!token) {
        logger_1.default.warn('[Telegram Webhook] Token not provided in query params');
        return res.status(400).json({ error: 'Token is required' });
    }
    try {
        const bot = (0, telegram_bot_1.createBotInstance)(token);
        // Process the update
        await bot.handleUpdate(req.body);
        // Always return 200 OK to Telegram
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.default.error('[Telegram Webhook] Error processing update:', error);
        // Return 200 even on error to prevent Telegram from retrying endlessly
        res.status(200).send('OK');
    }
});
exports.default = router;
