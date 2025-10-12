'use server';

import clientPromise from '@/lib/mongodb';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import type { BotUser } from '@/lib/types';

export interface BotStats {
    totalRevenue: number;
    totalSales: number;
    totalUsers: number;
}

export async function getBotStats(): Promise<BotStats> {
    try {
        const tenant = await getTenantFromSession();
        const tenantId = tenant._id.toString();

        const client = await clientPromise;
        const db = client.db('vematize');
        
        const salesCollection = db.collection('sales');
        const botUsersCollection = db.collection<BotUser>('botUsers');

        const [salesData, usersCount] = await Promise.all([
            salesCollection.aggregate([
                { $match: { tenantId, status: 'approved' } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalSales: { $sum: 1 } } }
            ]).toArray(),
            botUsersCollection.countDocuments({ tenantId })
        ]);

        const totalRevenue = salesData[0]?.totalRevenue ?? 0;
        const totalSales = salesData[0]?.totalSales ?? 0;

        return {
            totalRevenue,
            totalSales,
            totalUsers: usersCount,
        };
    } catch (error) {
        console.error('Database Error fetching bot stats:', error);
        throw new Error('Failed to fetch bot stats');
    }
}

export async function getDashboardStats() {
    try {
        const tenant = await getTenantFromSession();
        const tenantId = tenant._id.toString();

        const client = await clientPromise;
        const db = client.db('vematize');
        
        const salesCollection = db.collection('sales');
        const botUsersCollection = db.collection<BotUser>('botUsers');

        const [salesData, usersCount] = await Promise.all([
            salesCollection.aggregate([
                { $match: { tenantId, status: 'approved' } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalSales: { $sum: 1 } } }
            ]).toArray(),
            botUsersCollection.countDocuments({ tenantId })
        ]);

        const totalRevenue = salesData[0]?.totalRevenue ?? 0;
        const totalSales = salesData[0]?.totalSales ?? 0;

        return {
            totalRevenue,
            totalSales,
            totalUsers: usersCount,
        };
    } catch (error) {
        console.error('Database Error fetching dashboard stats:', error);
        throw new Error('Failed to fetch dashboard stats');
    }
}
