import cron from 'node-cron';
import clientPromise from '../config/database';
import logger from '../utils/logger';
import { Cart } from '../services/cart.service';
import { productService } from '../services/product.service';
import { channelService } from '../services/discord/channel.service';
import { tenantService } from '../services/tenant.service';

export const startExpirationJob = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        const requestId = Math.random().toString(36).substring(7);
        // logger.info(`[ExpirationJob:${requestId}] Checking for expired carts...`);

        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            // 20 minutes ago
            const expirationTime = new Date(Date.now() - 20 * 60 * 1000);

            const expiredCarts = await cartsCollection.find({
                status: 'active',
                updatedAt: { $lt: expirationTime }
            }).toArray();

            if (expiredCarts.length > 0) {
                logger.info(`[ExpirationJob:${requestId}] Found ${expiredCarts.length} expired carts.`);

                for (const cart of expiredCarts) {
                    try {
                        logger.info(`[ExpirationJob:${requestId}] Processing expired cart: ${cart._id}`);

                        // 1. Release Stock
                        for (const item of cart.items) {
                            await productService.releaseStock(item.productId, item.quantity);
                        }

                        // 2. Delete Thread
                        if (cart.metadata?.privateChannelId) {
                            const tenant = await tenantService.getTenantById(cart.tenantId);
                            const botToken = tenant?.connections?.discord?.botToken;

                            if (botToken) {
                                await channelService.deleteChannel(cart.metadata.privateChannelId, botToken);
                            }
                        }

                        // 3. Update Status
                        await cartsCollection.updateOne(
                            { _id: cart._id },
                            { $set: { status: 'abandoned', updatedAt: new Date() } }
                        );

                        logger.info(`[ExpirationJob:${requestId}] Cart ${cart._id} expired and processed.`);

                    } catch (err) {
                        logger.error(`[ExpirationJob:${requestId}] Error processing cart ${cart._id}:`, err);
                    }
                }
            }
        } catch (error) {
            logger.error(`[ExpirationJob:${requestId}] Error in expiration job:`, error);
        }
    });

    logger.info('🕒 Expiration Job started (running every minute)');
};
