"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInteractionsToken = validateInteractionsToken;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function validateInteractionsToken(token) {
    try {
        const client = await database_1.default;
        const db = client.db();
        const tenant = await db.collection('tenants').findOne({
            discordInteractionsToken: token
        });
        if (!tenant) {
            logger_1.default.error('[Discord] Invalid token - No tenant found');
            return null;
        }
        logger_1.default.info(`[Interactions Token] Token validated for tenant: ${tenant._id}`);
        return tenant;
    }
    catch (error) {
        logger_1.default.error('[Interactions Token] Error validating token:', error);
        return null;
    }
}
