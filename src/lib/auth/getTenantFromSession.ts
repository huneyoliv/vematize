import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { Tenant } from '@/lib/types';
import { ObjectId } from 'mongodb';

/**
 * Obtém o tenant do usuário logado a partir da sessão
 * 
 * @throws Error se não houver sessão ou se o usuário não for um tenant
 * @returns Tenant document do MongoDB
 */
export async function getTenantFromSession(): Promise<Tenant> {
  const sessionToken = cookies().get('session_token')?.value;
  
  console.log('[getTenantFromSession] Session token:', sessionToken ? 'EXISTS' : 'MISSING');
  
  if (!sessionToken) {
    throw new Error('Unauthorized: No session found');
  }

  const session = await getSession(sessionToken);
  
  console.log('[getTenantFromSession] Session data:', session ? { userId: session.userId, type: session.type } : 'NULL');
  
  if (!session) {
    throw new Error('Unauthorized: Invalid session');
  }

  if (session.type !== 'tenant') {
    throw new Error('Forbidden: Only tenants can access this resource');
  }

  // Busca o tenant no banco de dados
  const client = await clientPromise;
  const db = client.db('vematize');
  
  console.log('[getTenantFromSession] Searching for tenant with userId:', session.userId);
  
  // Converte string para ObjectId
  const tenant = await db.collection<Tenant>('tenants').findOne({
    _id: new ObjectId(session.userId)
  });

  console.log('[getTenantFromSession] Tenant found:', tenant ? 'YES' : 'NO');

  if (!tenant) {
    throw new Error('Tenant not found in database');
  }

  return tenant;
}

/**
 * Versão que retorna null ao invés de lançar erro
 * Útil para páginas que precisam funcionar com ou sem autenticação
 */
export async function getTenantFromSessionOrNull(): Promise<Tenant | null> {
  try {
    return await getTenantFromSession();
  } catch {
    return null;
  }
}

