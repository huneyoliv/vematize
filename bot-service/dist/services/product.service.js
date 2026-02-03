"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = exports.ProductService = void 0;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
class ProductService {
    async getProductById(productId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const productsCollection = db.collection('products');
            const product = await productsCollection.findOne({ _id: new mongodb_1.ObjectId(productId) });
            return product;
        }
        catch (error) {
            logger_1.default.error('Error fetching product:', error);
            return null;
        }
    }
    async reserveStock(productId, quantity) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const productsCollection = db.collection('products');
            const result = await productsCollection.updateOne({
                _id: new mongodb_1.ObjectId(productId),
                stock: { $gte: quantity }
            }, { $inc: { stock: -quantity } });
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error reserving stock:', error);
            return false;
        }
    }
    async releaseStock(productId, quantity) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const productsCollection = db.collection('products');
            const result = await productsCollection.updateOne({ _id: new mongodb_1.ObjectId(productId) }, { $inc: { stock: quantity } });
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error releasing stock:', error);
            return false;
        }
    }
}
exports.ProductService = ProductService;
exports.productService = new ProductService();
