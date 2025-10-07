import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * 🚨 ENDPOINT CRÍTICO DE SEGURANÇA 🚨
 * Revoga TODAS as sessões ativas de TODOS os usuários
 * Deve ser usado apenas em emergências de segurança
 */
export async function POST(request: NextRequest) {
    try {
        // Apenas admins podem revogar todas as sessões
        await requireAdminAuth();

        const client = await clientPromise;
        const db = client.db('vematize');
        const sessionsCollection = db.collection('sessions');

        // Deleta TODAS as sessões
        const result = await sessionsCollection.deleteMany({});

        console.log(`[SECURITY] TODAS AS SESSÕES FORAM REVOGADAS! Total: ${result.deletedCount} sessões deletadas.`);

        return NextResponse.json({
            success: true,
            message: `Todas as sessões foram revogadas com sucesso! ${result.deletedCount} sessões deletadas.`,
            deletedCount: result.deletedCount,
        });

    } catch (error: any) {
        console.error('[SECURITY] Erro ao revogar sessões:', error);

        if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
            return NextResponse.json({
                error: 'Acesso negado. Apenas administradores podem revogar sessões.'
            }, { status: 403 });
        }

        return NextResponse.json({
            error: 'Erro ao revogar sessões.'
        }, { status: 500 });
    }
}

