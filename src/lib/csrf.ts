/**
 * CSRF Protection (Custom Implementation)
 * Proteção contra Cross-Site Request Forgery
 * 
 * Implementação customizada de proteção CSRF usando tokens em cookies HttpOnly
 * e verificação de header/body.
 * 
 * Compatível com Edge Runtime e Node.js Runtime
 * 
 * 📚 IMPORTANTE: Server Actions do Next.js NÃO PRECISAM de CSRF
 * - Next.js Server Actions já têm proteção nativa (Same-Origin Policy)
 * - Cookies SameSite=Strict já previnem CSRF básico
 * - CSRF é necessário apenas para APIs públicas sem SameSite cookies
 */

import { cookies } from 'next/headers';

// Nome do cookie de CSRF
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Rotas que não precisam de proteção CSRF
const EXCLUDED_PATHS = [
  '/api/webhook',
  '/api/telegram-hook',
  '/api/discord-bot',
  '/api/cron',
  '/_next',
  '/favicon.ico',
  '/icon',
  '/site.webmanifest',
  '/android-chrome',
  '/apple-touch-icon',
];

/**
 * Gera um token CSRF aleatório
 * Usa Web Crypto API quando disponível (Edge Runtime), senão Node crypto
 */
function generateCsrfToken(): string {
  // Verifica se está em ambiente que suporta Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Edge Runtime / Browser - usa Web Crypto API
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '');
    return uuid1 + uuid2; // 64 caracteres hex
  } else {
    // Node.js Runtime - usa crypto do Node
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomBytes(32).toString('hex');
  }
}

/**
 * Verifica se uma rota está excluída da proteção CSRF
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(excluded => pathname.startsWith(excluded));
}

/**
 * Obtém ou cria um token CSRF
 * Deve ser chamado em rotas GET para garantir que o cookie existe
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = generateCsrfToken();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });
  }

  return token;
}

/**
 * Valida o token CSRF em requisições mutáveis (POST, PUT, DELETE, PATCH)
 * @returns null se válido, ou mensagem de erro
 */
export async function validateCsrfToken(request: Request): Promise<string | null> {
  const method = request.method;
  const { pathname } = new URL(request.url);

  // Ignora métodos seguros (GET, HEAD, OPTIONS)
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  // Ignora rotas excluídas
  if (isExcludedPath(pathname)) {
    return null;
  }

  // 🔒 IMPORTANTE: Next.js Server Actions NÃO PRECISAM de validação CSRF
  // Server Actions já têm proteção nativa através de:
  // 1. Same-Origin Policy (navegador bloqueia cross-origin)
  // 2. Headers especiais que não podem ser forjados
  // 3. SameSite=Strict nos cookies de sessão
  //
  // Server Actions são identificadas por:
  // - Header 'next-action' ou 'x-action'
  // - Content-Type 'text/plain;action' ou 'multipart/form-data' (para rotas internas)
  const nextAction = request.headers.get('next-action') || request.headers.get('x-action');
  const contentType = request.headers.get('content-type') || '';

  const isServerAction = nextAction || contentType.includes('text/plain;action');

  if (isServerAction) {
    // Esta é uma Server Action do Next.js, skip CSRF validation
    // console.log('[CSRF] Server Action detectada, skip validation');
    return null;
  }

  // EM DESENVOLVIMENTO: Permite sem validação para facilitar testes
  // Em produção, CSRF é obrigatório para APIs públicas
  if (process.env.NODE_ENV === 'development') {
    // console.warn('[CSRF] Development mode - CSRF validation skipped');
    return null;
  }

  // Obtém token do cookie
  const cookieHeader = request.headers.get('cookie');
  const cookieMatch = cookieHeader?.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  if (!cookieToken) {
    console.error('[CSRF] Missing CSRF cookie');
    return 'CSRF cookie missing';
  }

  // Obtém token do header
  let requestToken = request.headers.get(CSRF_HEADER_NAME);

  // Se não está no header, tenta obter do body (para form submissions)
  if (!requestToken && contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();
      requestToken = formData.get('csrf_token') as string | null;
    } catch (error) {
      // Ignora erro ao ler form data
    }
  }

  if (!requestToken) {
    console.error('[CSRF] Missing CSRF token in request');
    return 'CSRF token missing';
  }

  // Compara tokens (timing-safe se possível)
  try {
    const nodeCrypto = require('crypto');
    if (!nodeCrypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken))) {
      console.error('[CSRF] CSRF token mismatch');
      return 'CSRF token mismatch';
    }
  } catch (e) {
    // Fallback para comparação simples (não timing-safe) se node crypto falhar
    if (cookieToken !== requestToken) {
      console.error('[CSRF] CSRF token mismatch');
      return 'CSRF token mismatch';
    }
  }

  return null; // Validação passou
}

/**
 * Middleware wrapper para proteção CSRF
 * Retorna null se válido, ou Response de erro se inválido
 */
export async function csrfProtect(request: Request): Promise<Response | null> {
  const error = await validateCsrfToken(request);

  if (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'CSRF validation failed',
        code: 'CSRF_ERROR'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}

/**
 * Hook para obter token CSRF no cliente
 * Use em server components e passe para o cliente
 */
export async function getCsrfToken(): Promise<string> {
  return getOrCreateCsrfToken();
}

// ==================== EXEMPLOS DE USO ====================
// Veja EXPLICACAO_CSRF_COMPLETA.md para exemplos detalhados
