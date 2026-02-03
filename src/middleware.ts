import { NextRequest, NextResponse } from 'next/server';
import { csrfProtect } from '@/lib/csrf';

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|uploads/|[\\w-]+\\.\\w+).*)',
  ],
};

/**
 * Gera um token seguro usando Web Crypto API (compatível com Edge Runtime)
 */
function generateSecureToken(): string {
  // Usa crypto.randomUUID() que está disponível no Edge Runtime
  // Remove os hífens e adiciona mais aleatoriedade
  const uuid1 = crypto.randomUUID().replace(/-/g, '');
  const uuid2 = crypto.randomUUID().replace(/-/g, '');
  return uuid1 + uuid2; // 64 caracteres hex
}

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // DEBUG: Log para verificar se middleware está sendo executado em rotas de API
  if (pathname.startsWith('/api/discord-bot')) {
    console.log('[Middleware] ⚠️ Discord bot API route is being processed by middleware! This should NOT happen!');
    console.log('[Middleware] Path:', pathname);
  }

  // Cria response que será retornada
  let response = NextResponse.next();

  // ========================================
  // PROTEÇÃO CSRF
  // ========================================

  // 1. Para requisições GET/HEAD: Cria o cookie CSRF se não existir
  if (req.method === 'GET' || req.method === 'HEAD') {
    const csrfCookie = req.cookies.get('__Host-csrf-token');

    if (!csrfCookie) {
      // Gera novo token CSRF usando Web Crypto API (compatível com Edge Runtime)
      const token = generateSecureToken();

      // Define o cookie na resposta
      response.cookies.set('__Host-csrf-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 horas
      });

      console.log('[CSRF] Cookie CSRF criado para:', pathname);
    }
  }

  // 2. Para requisições mutáveis (POST, PUT, DELETE, PATCH): Valida CSRF
  // EXCETO rotas de API que são excluídas (webhooks, etc)
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    // Exclui rotas de API que não precisam de CSRF (webhooks externos)
    const isApiRoute = pathname.startsWith('/api/');
    const excludedApiPaths = [
      '/api/discord-bot',
      '/api/webhook',
      '/api/telegram-hook',
    ];
    const isExcludedApiPath = excludedApiPaths.some(excluded => pathname.startsWith(excluded));

    if (!isApiRoute || !isExcludedApiPath) {
      const csrfErrorResponse = await csrfProtect(req);
      if (csrfErrorResponse) {
        console.error('[CSRF] Token inválido ou ausente:', req.method, req.url);
        return csrfErrorResponse;
      }
    }
  }

  // ========================================
  // VALIDAÇÃO DE SESSÃO (BÁSICA)
  // ========================================
  // Verifica apenas se existe o cookie de sessão
  // Validação COMPLETA (tipo de usuário, permissões) é feita em:
  // 1. Layouts: Redirects automáticos para usuários já autenticados
  // 2. Server Actions: requireAuth(), getTenantFromSession(), etc.
  const sessionToken = req.cookies.get('session_token')?.value;
  const hasSession = !!sessionToken;

  // Rotas públicas que não precisam de autenticação
  // NOTA: /login e /register têm layouts que redirecionam usuários autenticados
  const publicPaths = ['/login', '/register', '/logout', '/'];
  const isPublicPath = publicPaths.includes(pathname);

  // ========================================
  // ROTAS PROTEGIDAS (ADMIN E TENANT)
  // ========================================
  // Lista de rotas que precisam de autenticação
  // Nota: Validação de role (admin vs tenant) é feita nos layouts e server actions
  const protectedPaths = ['/dashboard', '/settings', '/users', '/products', '/bots', '/plan', '/coupons', '/clients', '/reports', '/admins'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    if (!hasSession) {
      console.log('[Middleware] Acesso não autorizado, redirecionando para /login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // ✅ Validação de tipo de usuário (admin/tenant) é feita nos layouts
    // Cada rota tem seu próprio layout que verifica o role e redireciona se necessário
    return response;
  }

  // ========================================
  // ROTAS PÚBLICAS
  // ========================================
  if (isPublicPath) {
    return response;
  }

  // Qualquer outra rota é permitida
  return response;
}
