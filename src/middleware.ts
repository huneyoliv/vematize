import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host');
  const pathname = url.pathname;

  // Obter e VALIDAR token de sessão do cookie
  const sessionToken = req.cookies.get('session_token')?.value;
  const session = sessionToken ? await getSession(sessionToken) : null;
  const hasSession = !!session;

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/register', '/logout'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Verifica se é uma rota do Krov (admin)
  if (pathname.startsWith('/krov')) {
    // Login do krov é público
    if (pathname === '/krov/login' || pathname === '/krov/logout') {
      return NextResponse.next();
    }

    // Valida sessão E tipo de usuário
    if (!hasSession || !session) {
      return NextResponse.redirect(new URL('/krov/login', req.url));
    }

    // CRÍTICO: Verifica se é admin
    if (session.type !== 'admin') {
      console.warn(`[SECURITY] Tentativa de acesso não autorizado ao Krov por: ${session.email}`);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  }

  // Se for localhost sem subdomínio (para desenvolvimento)
  if (!hostname || hostname.startsWith('localhost:')) {
    const protectedPaths = ['/dashboard', '/settings', '/users', '/products', '/sales', '/bots'];
    const isProtectedPath = protectedPaths.some(path => pathname.includes(path));
    
    if (isProtectedPath) {
      if (!hasSession || !session) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // CRÍTICO: Extrair subdomain da URL (formato: /subdomain/dashboard)
      const pathSegments = pathname.split('/').filter(Boolean);
      const urlSubdomain = pathSegments[0];

      // Se houver subdomain na URL, valida se o usuário pertence a ele
      if (urlSubdomain && session.type === 'tenant' && session.subdomain !== urlSubdomain) {
        console.warn(`[SECURITY] Tentativa de acesso não autorizado: ${session.email} tentou acessar ${urlSubdomain}, mas pertence a ${session.subdomain}`);
        return NextResponse.redirect(new URL(`/${session.subdomain}/dashboard`, req.url));
      }
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
    if (!hasSession || !session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // CRÍTICO: Verifica se o usuário pertence a este subdomain
    if (session.type === 'tenant' && session.subdomain !== subdomain) {
      console.warn(`[SECURITY] Tentativa de acesso não autorizado: ${session.email} tentou acessar ${subdomain}, mas pertence a ${session.subdomain}`);
      // Redireciona para o subdomain correto do usuário
      const correctUrl = new URL(req.url);
      correctUrl.hostname = correctUrl.hostname.replace(subdomain, session.subdomain);
      correctUrl.pathname = '/dashboard';
      return NextResponse.redirect(correctUrl);
    }
  }

  return NextResponse.next();
}
