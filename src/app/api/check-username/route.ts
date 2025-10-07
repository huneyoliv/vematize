import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

/**
 * API para validar se um username está disponível
 * GET /api/check-username?username=teste
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { available: false, message: 'Username é obrigatório' },
        { status: 400 }
      );
    }

    // Validação básica do formato
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        available: false,
        message: 'Username inválido. Use 3-20 caracteres: a-z, 0-9, _',
      });
    }

    const client = await clientPromise;
    const db = client.db('vematize');

    // Verifica se username já existe
    const existingTenant = await db.collection('tenants').findOne({ username });

    if (existingTenant) {
      return NextResponse.json({
        available: false,
        message: 'Este username já está em uso',
      });
    }

    return NextResponse.json({
      available: true,
      message: 'Username disponível!',
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { available: false, message: 'Erro ao verificar username' },
      { status: 500 }
    );
  }
}

