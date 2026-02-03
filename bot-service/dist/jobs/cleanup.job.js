"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCleanupJob = startCleanupJob;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
function startCleanupJob() {
    // Run every day at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        logger_1.default.info('[Cleanup Job] Starting session cleanup...');
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const sessionsCollection = db.collection('sessions');
            const now = new Date();
            const result = await sessionsCollection.deleteMany({
                expiresAt: { $lt: now }
            });
            logger_1.default.info(`[Cleanup Job] Removed ${result.deletedCount} expired sessions.`);
        }
        catch (error) {
            logger_1.default.error('[Cleanup Job] Error cleaning up sessions:', error);
        }
    });
    logger_1.default.info('[Cleanup Job] Scheduled to run daily at midnight.');
}
