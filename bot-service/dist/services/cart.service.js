"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartService = exports.CartService = void 0;
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
class CartService {
    async createCart(cartData) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            const cart = {
                ...cartData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = await cartsCollection.insertOne(cart);
            return result.insertedId.toString();
        }
        catch (error) {
            logger_1.default.error('Error creating cart:', error);
            return null;
        }
    }
    async getCart(cartId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            return await cartsCollection.findOne({ _id: new mongodb_1.ObjectId(cartId) });
        }
        catch (error) {
            logger_1.default.error('Error fetching cart:', error);
            return null;
        }
    }
    async updateCartStatus(cartId, status) {
        try {
            // Se o status for 'abandoned' (cancelado/expirado), deleta o carrinho
            if (status === 'abandoned') {
                return await this.deleteCart(cartId);
            }
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            const result = await cartsCollection.updateOne({ _id: new mongodb_1.ObjectId(cartId) }, { $set: { status, updatedAt: new Date() } });
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error updating cart status:', error);
            return false;
        }
    }
    async deleteCart(cartId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            const result = await cartsCollection.deleteOne({ _id: new mongodb_1.ObjectId(cartId) });
            return result.deletedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error deleting cart:', error);
            return false;
        }
    }
    async updateCartItemQuantity(cartId, quantity) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            // Atualiza a quantidade do primeiro item (assumindo carrinho de item único por enquanto)
            const result = await cartsCollection.updateOne({ _id: new mongodb_1.ObjectId(cartId) }, {
                $set: {
                    "items.0.quantity": quantity,
                    updatedAt: new Date()
                }
            });
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error updating cart quantity:', error);
            return false;
        }
    }
    async updateCartCoupon(cartId, couponCode) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const cartsCollection = db.collection('carts');
            const result = await cartsCollection.updateOne({ _id: new mongodb_1.ObjectId(cartId) }, {
                $set: {
                    "metadata.couponCode": couponCode,
                    updatedAt: new Date()
                }
            });
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.default.error('Error updating cart coupon:', error);
            return false;
        }
    }
}
exports.CartService = CartService;
exports.cartService = new CartService();
