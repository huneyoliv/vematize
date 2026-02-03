"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saleService = exports.SaleService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
class SaleService {
    async createSale(saleData) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const salesCollection = db.collection('sales');
            const sale = {
                ...saleData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = await salesCollection.insertOne(sale);
            return result.insertedId.toString();
        }
        catch (error) {
            logger_1.default.error('Error creating sale:', error);
            return null;
        }
    }
    async getSaleByPaymentId(paymentId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const salesCollection = db.collection('sales');
            return await salesCollection.findOne({ 'paymentDetails.paymentId': paymentId });
        }
        catch (error) {
            logger_1.default.error('Error fetching sale by paymentId:', error);
            return null;
        }
    }
}
exports.SaleService = SaleService;
exports.saleService = new SaleService();
