import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host');
  const pathname = url.pathname;

  // Verifica apenas se existe o cookie de sessão (validação completa nas server actions)
  const sessionToken = req.cookies.get('session_token')?.value;
  const hasSession = !!sessionToken;

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/register', '/logout'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Verifica se é uma rota do Krov (admin)
  if (pathname.startsWith('/krov')) {
    // Login do krov é público
    if (pathname === '/krov/login' || pathname === '/krov/logout') {
      return NextResponse.next();
    }

    // Verifica se tem cookie de sessão (validação completa no server-side)
    if (!hasSession) {
      return NextResponse.redirect(new URL('/krov/login', req.url));
    }
    
    // A validação de tipo de usuário (admin) é feita nas server actions
    // via requireAdminAuth() para evitar problemas com Edge Runtime

    return NextResponse.next();
  }

  // Se for localhost sem subdomínio (para desenvolvimento)
  if (!hostname || hostname.startsWith('localhost:')) {
    const protectedPaths = ['/dashboard', '/settings', '/users', '/products', '/sales', '/bots'];
    const isProtectedPath = protectedPaths.some(path => pathname.includes(path));
    
    if (isProtectedPath) {
      if (!hasSession) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // A validação de ownership do subdomain é feita nas server actions
      // via requireTenantAccess() para evitar problemas com Edge Runtime
    }
    
    return NextResponse.next();
  }
  
  const subdomain = hostname?.split('.')[0] || '';

  // Rotas públicas gerais
  if (subdomain === 'krov' || subdomain === '' || subdomain === 'www' || isPublicPath) {
    return NextResponse.next();
  }

  // Verifica status do tenant
  try {
    const api_url = `${url.protocol}//${hostname}/api/tenant-status/${subdomain}`;
    const response = await fetch(api_url);

    if (response.ok) {
        const { status } = await response.json();

        if (status === 'inactive') {
            const isAllowedPath = url.pathname.includes('/plan') || url.pathname.includes('/settings');
            
            if (!isAllowedPath) {
                console.log(`[Middleware] Bloqueando acesso para o tenant inativo: ${subdomain}. Redirecionando para /plan.`);
                const redirectUrl = new URL(url.pathname.startsWith(`/${subdomain}`) ? `/${subdomain}/plan` : `/plan`, req.url);
                redirectUrl.searchParams.set('error', 'subscription_inactive');
                return NextResponse.redirect(redirectUrl);
            }
        }
    } else {
        console.warn(`[Middleware] A verificação de status do tenant falhou com status ${response.status} para o subdomínio ${subdomain}.`);
    }

  } catch (error) {
    console.error('[Middleware] Erro ao fazer fetch do status do tenant:', error);
  }

  // Verifica autenticação para rotas protegidas de tenant
  const protectedPaths = ['/dashboard', '/settings', '/users', '/products', '/sales', '/bots'];
  const isProtectedPath = protectedPaths.some(path => pathname.includes(path));

  if (isProtectedPath) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // A validação de ownership do subdomain é feita nas server actions
    // via requireTenantAccess() para garantir segurança no server-side
    // (Edge Runtime do middleware não suporta chamadas MongoDB diretas)
  }

  return NextResponse.next();
}
