"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = exports.TenantService = void 0;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
class TenantService {
    async getTenantById(tenantId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const tenantsCollection = db.collection('tenants');
            return await tenantsCollection.findOne({ _id: new mongodb_1.ObjectId(tenantId) });
        }
        catch (error) {
            logger_1.default.error('Error fetching tenant:', error);
            return null;
        }
    }
}
exports.TenantService = TenantService;
exports.tenantService = new TenantService();
