/**
 * Wrapper de Autorização para Server Actions
 * 
 * Este wrapper garante que todas as server actions que operam
 * em recursos de tenant validem ownership antes de executar.
 * 
 * USO OBRIGATÓRIO em todas as actions que recebem subdomain.
 */

import { requireTenantAccess } from '../auth';

/**
 * Wrapper que força validação de tenant ownership
 * @param handler - Função da server action a ser protegida
 * @returns Função wrapeada com validação automática
 */
export function withTenantAuth<TArgs extends any[], TReturn>(
  handler: (subdomain: string, ...args: TArgs) => Promise<TReturn>
): (subdomain: string, ...args: TArgs) => Promise<TReturn> {
  return async (subdomain: string, ...args: TArgs): Promise<TReturn> => {
    // VALIDAÇÃO CRÍTICA: Verifica se usuário tem acesso ao tenant
    await requireTenantAccess(subdomain);
    
    // Executa handler apenas se validação passou
    return handler(subdomain, ...args);
  };
}

/**
 * Versão alternativa que retorna a sessão validada
 */
export function withTenantAuthSession<TArgs extends any[], TReturn>(
  handler: (subdomain: string, session: any, ...args: TArgs) => Promise<TReturn>
): (subdomain: string, ...args: TArgs) => Promise<TReturn> {
  return async (subdomain: string, ...args: TArgs): Promise<TReturn> => {
    const session = await requireTenantAccess(subdomain);
    return handler(subdomain, session, ...args);
  };
}

