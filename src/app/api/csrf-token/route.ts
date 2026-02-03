/**
 * CSRF Token API Endpoint
 * 
 * Fornece o token CSRF para o frontend usar em requisições
 * O cookie já deve estar criado pelo middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Gera token seguro compatível com Edge Runtime
 */
function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return uuid1 + uuid2;
  } else {
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomBytes(32).toString('hex');
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();

  // Tenta obter cookie existente
  let token = cookieStore.get('__Host-csrf-token')?.value;

  // Se não existe, cria um novo
  if (!token) {
    token = generateSecureToken();
    cookieStore.set('__Host-csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });
  }

  // Retorna o token para o frontend usar
  // Nota: O token também está no cookie HttpOnly, mas precisamos
  // retornar uma versão para o frontend incluir nos headers
  return NextResponse.json({
    csrfToken: token,
    message: 'CSRF token generated successfully',
  });
}

