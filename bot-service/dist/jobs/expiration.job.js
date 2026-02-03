"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpirationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const product_service_1 = require("../services/product.service");
const channel_service_1 = require("../services/discord/channel.service");
const tenant_service_1 = require("../services/tenant.service");
const startExpirationJob = () => {
    // Run every minute
    node_cron_1.default.schedule('* * * * *', async () => {
        const requestId = Math.random().toString(36).substring(7);
        // logger.info(`[ExpirationJob:${requestId}] Checking for expired carts...`);
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            // 20 minutes ago
            const expirationTime = new Date(Date.now() - 20 * 60 * 1000);
            const expiredCarts = await cartsCollection.find({
                status: 'active',
                updatedAt: { $lt: expirationTime }
            }).toArray();
            if (expiredCarts.length > 0) {
                logger_1.default.info(`[ExpirationJob:${requestId}] Found ${expiredCarts.length} expired carts.`);
                for (const cart of expiredCarts) {
                    try {
                        logger_1.default.info(`[ExpirationJob:${requestId}] Processing expired cart: ${cart._id}`);
                        // 1. Release Stock
                        for (const item of cart.items) {
                            await product_service_1.productService.releaseStock(item.productId, item.quantity);
                        }
                        // 2. Delete Thread
                        if (cart.metadata?.privateChannelId) {
                            const tenant = await tenant_service_1.tenantService.getTenantById(cart.tenantId);
                            const botToken = tenant?.connections?.discord?.botToken;
                            if (botToken) {
                                await channel_service_1.channelService.deleteChannel(cart.metadata.privateChannelId, botToken);
                            }
                        }
                        // 3. Update Status
                        await cartsCollection.updateOne({ _id: cart._id }, { $set: { status: 'abandoned', updatedAt: new Date() } });
                        logger_1.default.info(`[ExpirationJob:${requestId}] Cart ${cart._id} expired and processed.`);
                    }
                    catch (err) {
                        logger_1.default.error(`[ExpirationJob:${requestId}] Error processing cart ${cart._id}:`, err);
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error(`[ExpirationJob:${requestId}] Error in expiration job:`, error);
        }
    });
    logger_1.default.info('🕒 Expiration Job started (running every minute)');
};
exports.startExpirationJob = startExpirationJob;
