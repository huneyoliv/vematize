import cron from 'node-cron';
import clientPromise from '../config/database';
import logger from '../utils/logger';

export function startCleanupJob() {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        logger.info('[Cleanup Job] Starting session cleanup...');
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const sessionsCollection = db.collection('sessions');

            const now = new Date();
            const result = await sessionsCollection.deleteMany({
                expiresAt: { $lt: now }
            });

            logger.info(`[Cleanup Job] Removed ${result.deletedCount} expired sessions.`);
        } catch (error) {
            logger.error('[Cleanup Job] Error cleaning up sessions:', error);
        }
    });
    logger.info('[Cleanup Job] Scheduled to run daily at midnight.');
}
