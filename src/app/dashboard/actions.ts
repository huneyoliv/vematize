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

        // Busca todas as vendas aprovadas do tenant
        const approvedSales = await salesCollection.find({ 
            tenantId, 
            status: 'approved' 
        }).toArray();

        // Calcula totais manualmente
        const totalRevenue = approvedSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
        const totalSales = approvedSales.length;

        // Conta usuários
        const usersCount = await botUsersCollection.countDocuments({ tenantId });

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

        // Busca todas as vendas aprovadas do tenant
        const approvedSales = await salesCollection.find({ 
            tenantId, 
            status: 'approved' 
        }).toArray();

        // Calcula totais manualmente
        const totalRevenue = approvedSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
        const totalSales = approvedSales.length;

        // Conta usuários
        const usersCount = await botUsersCollection.countDocuments({ tenantId });

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
