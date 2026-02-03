'use server';

import clientPromise from '@/lib/mongodb';
import { unstable_noStore as noStore } from 'next/cache';
import { ObjectId } from 'mongodb';
import type { User as DbUser } from '@/lib/types';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export type BotUser = {
    id: string;
    name: string | null;
    identifier: string;
    platform: 'Telegram' | 'Discord' | 'WhatsApp' | 'Unknown';
    type: 'Compra' | 'Assinatura' | 'Nenhum';
    productName: string;
    status: string; // Status da entrega ou da assinatura
    deliveryStatus?: 'Entregue' | 'Pendente' | 'Falha' | 'N/A';
    subscriptionExpiresAt?: string;
    subscriptionDuration?: string;
    joinDate: string;
};

function calculateDuration(startDate: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} dias`;
    const months = Math.floor(diffDays / 30);
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    return `${years} anos`;
}

export async function getBotUsers(): Promise<BotUser[]> {
    noStore();
    try {
        // 🔒 Obtém tenant da sessão
        const tenant = await getTenantFromSession();

        const client = await clientPromise;
        const db = client.db('vematize');

        const usersCollection = db.collection<DbUser>('users');
        // Busca usuários do tenant que tenham compras OU plano definido
        const usersFromDb = await usersCollection.find({
            tenantId: tenant._id.toString(),
            $or: [
                { "purchases.0": { $exists: true } },
                { plan: { $ne: "Nenhum" } },
                { plan: { $exists: true, $ne: null as any } }
            ]
        }).toArray();

        if (!usersFromDb || usersFromDb.length === 0) {
            return [];
        }

        return usersFromDb.map(user => {
            const objectId = new ObjectId(user._id);
            const joinDate = objectId.getTimestamp();

            // Determina plataforma
            let platform: BotUser['platform'] = 'Unknown';
            let identifier = user.username ? `@${user.username}` : 'N/A';

            if (user.telegramId) {
                platform = 'Telegram';
                identifier = user.username ? `@${user.username}` : `${user.telegramId}`;
            } else if (user.discordId) {
                platform = 'Discord';
                identifier = user.username ? `@${user.username}` : `${user.discordId}`;
            } else if (user.whatsappId) {
                platform = 'WhatsApp';
                identifier = user.whatsappId;
            }

            // Determina tipo e detalhes
            let type: BotUser['type'] = 'Nenhum';
            let productName = '-';
            let status = user.state || 'Inativo';
            let deliveryStatus: BotUser['deliveryStatus'] = 'N/A';
            let subscriptionExpiresAt = undefined;
            let subscriptionDuration = undefined;

            // Prioridade: Assinatura Ativa > Última Compra
            const hasActiveSubscription = user.plan && user.plan !== 'Nenhum';

            if (hasActiveSubscription) {
                type = 'Assinatura';
                productName = user.plan || 'Plano Desconhecido';
                status = user.state === 'active' ? 'Ativo' : 'Inativo';
                subscriptionDuration = calculateDuration(joinDate);
                // TODO: Adicionar data de expiração real se disponível no user schema futuramente
            } else if (user.purchases && user.purchases.length > 0) {
                // Pega a última compra
                const lastPurchase = user.purchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0];
                type = 'Compra';
                productName = lastPurchase.productName;
                status = lastPurchase.status === 'approved' ? 'Aprovado' : lastPurchase.status;

                // Infere entrega baseado no status da compra por enquanto
                if (lastPurchase.status === 'approved') {
                    deliveryStatus = 'Entregue';
                } else if (lastPurchase.status === 'pending') {
                    deliveryStatus = 'Pendente';
                } else {
                    deliveryStatus = 'Falha';
                }
            }

            return {
                id: user._id.toString(),
                name: user.name || 'Usuário sem nome',
                identifier,
                platform,
                type,
                productName,
                status,
                deliveryStatus,
                subscriptionExpiresAt,
                subscriptionDuration,
                joinDate: joinDate.toLocaleDateString('pt-BR'),
            }
        });

    } catch (error) {
        console.error('Database error fetching bot users:', error);
        return [];
    }
}
