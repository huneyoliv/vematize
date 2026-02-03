import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';
import { Sale } from '../types';

export class SaleService {
    async createSale(saleData: Sale): Promise<string | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const salesCollection = db.collection<Sale>('sales');

            const sale: Sale = {
                ...saleData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await salesCollection.insertOne(sale);
            return result.insertedId.toString();
        } catch (error) {
            logger.error('Error creating sale:', error);
            return null;
        }
    }

    async getSaleByPaymentId(paymentId: string): Promise<Sale | null> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const salesCollection = db.collection<Sale>('sales');

            return await salesCollection.findOne({ 'paymentDetails.paymentId': paymentId });
        } catch (error) {
            logger.error('Error fetching sale by paymentId:', error);
            return null;
        }
    }
}

export const saleService = new SaleService();
