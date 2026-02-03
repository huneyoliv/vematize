'use server';

import clientPromise from '@/lib/mongodb';
import { Sale } from '@/lib/types';
import { ObjectId } from 'mongodb';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export async function searchSale(query: string) {
    if (!query) return null;

    try {
        const tenant = await getTenantFromSession();
        if (!tenant) return null;

        const client = await clientPromise;
        const db = client.db('vematize');
        const salesCollection = db.collection<Sale>('sales');

        // Search by paymentId (Gateway ID)
        let sale = await salesCollection.findOne({
            'paymentDetails.paymentId': query.trim(),
            tenantId: tenant._id.toString()
        });

        // If not found, try by Sale ID (ObjectId)
        if (!sale && ObjectId.isValid(query)) {
            sale = await salesCollection.findOne({
                _id: new ObjectId(query),
                tenantId: tenant._id.toString()
            });
        }

        if (!sale) return null;

        // Convert ObjectId to string for serialization
        return JSON.parse(JSON.stringify(sale));
    } catch (error) {
        console.error('Error searching sale:', error);
        return null;
    }
}
