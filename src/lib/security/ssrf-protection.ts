/**
 * SSRF Protection (Server-Side Request Forgery)
 * 
 * Protege contra ataques SSRF validando e sanitizando URLs fornecidas por usuários
 * antes de fazer requisições HTTP.
 * 
 * Bloqueia:
 * - IPs privados (127.0.0.1, 10.x.x.x, 192.168.x.x, 172.16-31.x.x)
 * - Metadata endpoints de clouds (169.254.169.254)
 * - Protocolos perigosos (file://, gopher://, etc)
 * - Redirecionamentos maliciosos
 */

import { URL } from 'url';

// ==================== LISTAS DE BLOQUEIO ====================

// IPs e ranges privados que nunca devem ser acessados
const BLOCKED_IP_RANGES = [
  // Loopback
  /^127\./,
  /^::1$/,
  /^localhost$/i,
  
  // Private networks (RFC 1918)
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  
  // Link-local
  /^169\.254\./,
  /^fe80:/i,
  
  // Cloud metadata endpoints (AWS, GCP, Azure, etc)
  /^169\.254\.169\.254$/,
  
  // Private IPv6
  /^f[cd]/i,
];

// Protocolos permitidos (whitelist)
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Domínios que devem estar em whitelist (se configurado)
let DOMAIN_WHITELIST: string[] | null = null;

/**
 * Configura whitelist de domínios permitidos
 * Se configurado, APENAS estes domínios serão permitidos
 */
export function configureDomainWhitelist(domains: string[]): void {
  DOMAIN_WHITELIST = domains.map(d => d.toLowerCase());
}

// ==================== VALIDAÇÃO ====================

export type URLValidationResult = {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
};

/**
 * Valida uma URL fornecida por usuário contra SSRF
 * @param urlString - URL a ser validada
 * @param options - Opções de validação
 */
export function validateURL(
  urlString: string,
  options: {
    allowLocalhost?: boolean;
    requireHttps?: boolean;
    maxRedirects?: number;
  } = {}
): URLValidationResult {
  try {
    // 1. Parse da URL
    const url = new URL(urlString);

    // 2. Valida protocolo
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Protocolo não permitido: ${url.protocol}. Use http:// ou https://`,
      };
    }

    // 3. Força HTTPS se requerido
    if (options.requireHttps && url.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Apenas URLs HTTPS são permitidas',
      };
    }

    // 4. Valida hostname
    const hostname = url.hostname.toLowerCase();

    // Verifica whitelist de domínios se configurada
    if (DOMAIN_WHITELIST !== null) {
      const isWhitelisted = DOMAIN_WHITELIST.some(
        domain => hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isWhitelisted) {
        return {
          valid: false,
          error: `Domínio não autorizado: ${hostname}`,
        };
      }
    }

    // 5. Verifica IPs e ranges bloqueados
    const isBlockedIP = BLOCKED_IP_RANGES.some(pattern => pattern.test(hostname));

    if (isBlockedIP && !options.allowLocalhost) {
      return {
        valid: false,
        error: 'Acesso a redes privadas não é permitido',
      };
    }

    // 6. Verifica se é um IP literal suspeito
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      // É um IP - valida se não está em range privado
      const octets = hostname.split('.').map(Number);
      
      // Verifica ranges privados numericamente
      if (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 127)
      ) {
        if (!options.allowLocalhost) {
          return {
            valid: false,
            error: 'Acesso a redes privadas não é permitido',
          };
        }
      }
    }

    // 7. URL válida
    return {
      valid: true,
      sanitizedUrl: url.toString(),
    };

  } catch (error) {
    return {
      valid: false,
      error: 'URL inválida',
    };
  }
}

// ==================== FETCH SEGURO ====================

export type SafeFetchOptions = RequestInit & {
  timeout?: number;
  maxRedirects?: number;
  allowLocalhost?: boolean;
  requireHttps?: boolean;
};

/**
 * Fetch seguro que valida URLs antes de fazer requisições
 * @param urlString - URL a ser requisitada
 * @param options - Opções de fetch + validação
 */
export async function safeFetch(
  urlString: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  // 1. Valida URL
  const validation = validateURL(urlString, {
    allowLocalhost: options.allowLocalhost,
    requireHttps: options.requireHttps,
  });

  if (!validation.valid) {
    throw new Error(`SSRF Protection: ${validation.error}`);
  }

  // 2. Configura timeout
  const timeout = options.timeout || 10000; // 10 segundos padrão
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 3. Faz requisição com proteções
    const response = await fetch(validation.sanitizedUrl!, {
      ...options,
      signal: controller.signal,
      redirect: 'manual', // Não segue redirects automaticamente
    });

    // 4. Verifica redirects
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      
      if (redirectUrl) {
        // Valida URL de redirect
        const redirectValidation = validateURL(redirectUrl, {
          allowLocalhost: options.allowLocalhost,
          requireHttps: options.requireHttps,
        });

        if (!redirectValidation.valid) {
          throw new Error(`SSRF Protection em redirect: ${redirectValidation.error}`);
        }

        // Previne redirect loops
        const maxRedirects = options.maxRedirects || 5;
        if (maxRedirects <= 0) {
          throw new Error('Número máximo de redirects atingido');
        }

        // Segue redirect de forma segura
        return safeFetch(redirectUrl, {
          ...options,
          maxRedirects: maxRedirects - 1,
        });
      }
    }

    return response;

  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== HELPERS ====================

/**
 * Extrai domínio de uma URL de forma segura
 */
export function extractDomain(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Verifica se uma URL é segura (valida mas não faz requisição)
 */
export function isURLSafe(
  urlString: string,
  options: {
    allowLocalhost?: boolean;
    requireHttps?: boolean;
  } = {}
): boolean {
  const validation = validateURL(urlString, options);
  return validation.valid;
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Validação simples
const result = validateURL('https://example.com/image.jpg');
if (!result.valid) {
  console.error(result.error);
}

// Exemplo 2: Fetch seguro
try {
  const response = await safeFetch('https://api.example.com/data', {
    method: 'GET',
    timeout: 5000,
    requireHttps: true,
  });
  const data = await response.json();
} catch (error) {
  console.error('Requisição bloqueada:', error);
}

// Exemplo 3: Whitelist de domínios
configureDomainWhitelist(['api.example.com', 'cdn.example.com']);
const result = validateURL('https://malicious.com'); // Bloqueado
*/

