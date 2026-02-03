import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';

export interface Product {
    _id: ObjectId;
    tenantId: string;
    name: string;
    description?: string;
    price: number;
    type: 'product' | 'subscription';
    stock?: number | null;
    image?: string;
}

export class ProductService {
    async getProductById(productId: string): Promise<Product | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const productsCollection = db.collection<Product>('products');

            const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
            return product;
        } catch (error) {
            logger.error('Error fetching product:', error);
            return null;
        }
    }
    async reserveStock(productId: string, quantity: number): Promise<boolean> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const productsCollection = db.collection<Product>('products');

            const result = await productsCollection.updateOne(
                {
                    _id: new ObjectId(productId),
                    stock: { $gte: quantity }
                },
                { $inc: { stock: -quantity } }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error reserving stock:', error);
            return false;
        }
    }

    async releaseStock(productId: string, quantity: number): Promise<boolean> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const productsCollection = db.collection<Product>('products');

            const result = await productsCollection.updateOne(
                { _id: new ObjectId(productId) },
                { $inc: { stock: quantity } }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error releasing stock:', error);
            return false;
        }
    }
}

export const productService = new ProductService();
