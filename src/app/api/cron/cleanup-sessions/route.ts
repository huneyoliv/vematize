import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

/**
 * Cron Job: Limpeza de Sessões Expiradas
 * 
 * Este endpoint deve ser chamado diariamente à meia-noite (00:00) via Vercel Cron Jobs.
 * Remove todas as sessões cuja data de expiração (expiresAt) já passou.
 * 
 * Configuração no vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // 🔒 Segurança: Verifica se a requisição vem do Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron Cleanup] Unauthorized access attempt');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    const now = new Date();

    // Remove todas as sessões expiradas
    const result = await sessionsCollection.deleteMany({
      expiresAt: { $lt: now }
    });

    console.log(`[Cron Cleanup] Removed ${result.deletedCount} expired sessions at ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${result.deletedCount} expired sessions`,
      deletedCount: result.deletedCount,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error('[Cron Cleanup] Error cleaning up sessions:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Permite também limpeza manual via POST (útil para testes ou emergências)
 */
export async function POST(request: Request) {
  return GET(request);
}

