import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';

export interface CartItem {
    productId: string;
    quantity: number;
    price: number;
    name: string;
}

export interface Cart {
    _id?: ObjectId;
    userId: string; // Discord User ID
    tenantId: string;
    items: CartItem[];
    status: 'active' | 'completed' | 'abandoned';
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        discordChannelId?: string;
        discordMessageId?: string;
        panelId?: string;
        privateChannelId?: string;
        couponCode?: string;
    };
}

export class CartService {
    async createCart(cartData: Omit<Cart, '_id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            const cart: Cart = {
                ...cartData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await cartsCollection.insertOne(cart);
            return result.insertedId.toString();
        } catch (error) {
            logger.error('Error creating cart:', error);
            return null;
        }
    }

    async getCart(cartId: string): Promise<Cart | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            return await cartsCollection.findOne({ _id: new ObjectId(cartId) });
        } catch (error) {
            logger.error('Error fetching cart:', error);
            return null;
        }
    }
    async updateCartStatus(cartId: string, status: Cart['status']): Promise<boolean> {
        try {
            // Se o status for 'abandoned' (cancelado/expirado), deleta o carrinho
            if (status === 'abandoned') {
                return await this.deleteCart(cartId);
            }

            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            const result = await cartsCollection.updateOne(
                { _id: new ObjectId(cartId) },
                { $set: { status, updatedAt: new Date() } }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating cart status:', error);
            return false;
        }
    }

    async deleteCart(cartId: string): Promise<boolean> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            const result = await cartsCollection.deleteOne({ _id: new ObjectId(cartId) });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error('Error deleting cart:', error);
            return false;
        }
    }

    async updateCartItemQuantity(cartId: string, quantity: number): Promise<boolean> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            // Atualiza a quantidade do primeiro item (assumindo carrinho de item único por enquanto)
            const result = await cartsCollection.updateOne(
                { _id: new ObjectId(cartId) },
                {
                    $set: {
                        "items.0.quantity": quantity,
                        updatedAt: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating cart quantity:', error);
            return false;
        }
    }
    async updateCartCoupon(cartId: string, couponCode: string): Promise<boolean> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const cartsCollection = db.collection<Cart>('carts');

            const result = await cartsCollection.updateOne(
                { _id: new ObjectId(cartId) },
                {
                    $set: {
                        "metadata.couponCode": couponCode,
                        updatedAt: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating cart coupon:', error);
            return false;
        }
    }
}

export const cartService = new CartService();
