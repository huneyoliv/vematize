"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const env_1 = require("../config/env");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    try {
        // Testa conexão com MongoDB
        const client = await database_1.default;
        const admin = client.db().admin();
        await admin.ping();
        res.json({
            status: 'ok',
            service: 'vematize-bot-service',
            version: '1.0.0',
            environment: env_1.env.NODE_ENV,
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected'
            }
        });
    }
    catch (error) {
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
exports.default = router;
