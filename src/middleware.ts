import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Verifica apenas se existe o cookie de sessão (validação completa nas server actions)
  const sessionToken = req.cookies.get('session_token')?.value;
  const hasSession = !!sessionToken;

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/register', '/logout', '/'];
  const isPublicPath = publicPaths.includes(pathname);

  // ========================================
  // ROTAS DO KROV (ADMIN)
  // ========================================
  if (pathname.startsWith('/krov')) {
    // Login do krov é público
    if (pathname === '/krov/login' || pathname === '/krov/logout') {
      return NextResponse.next();
    }

    // Rotas protegidas precisam de sessão
    if (!hasSession) {
      return NextResponse.redirect(new URL('/krov/login', req.url));
    }
    
    // Validação de admin é feita nas server actions via requireAdminAuth()
    return NextResponse.next();
  }

  // ========================================
  // ROTAS DE TENANT (CLIENTE)
  // ========================================
  const tenantProtectedPaths = ['/dashboard', '/settings', '/users', '/products', '/bots', '/plan'];
  const isTenantProtectedPath = tenantProtectedPaths.some(path => pathname.startsWith(path));

  if (isTenantProtectedPath) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Validação de tenant é feita nas server actions via getTenantFromSession()
    return NextResponse.next();
  }

  // ========================================
  // ROTAS PÚBLICAS
  // ========================================
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Qualquer outra rota é permitida
  return NextResponse.next();
}
