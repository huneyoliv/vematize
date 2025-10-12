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
  
  if (!sessionToken) {
    throw new Error('Unauthorized: No session found');
  }

  const session = await getSession(sessionToken);
  
  if (!session) {
    throw new Error('Unauthorized: Invalid session');
  }

  if (session.type !== 'tenant') {
    throw new Error('Forbidden: Only tenants can access this resource');
  }

  try {
    // Busca o tenant no banco de dados
    const client = await clientPromise;
    const db = client.db('vematize');
    
    // Converte string para ObjectId
    const tenant = await db.collection<Tenant>('tenants').findOne({
      _id: new ObjectId(session.userId)
    });

    if (!tenant) {
      throw new Error('Tenant not found in database');
    }

    return tenant;
  } catch (error: any) {
    // Log detalhado de erros de conexão
    if (error.name === 'MongoNetworkError' || error.code === 'ECONNRESET') {
      console.error('[getTenantFromSession] MongoDB connection error:', {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      throw new Error('Database connection failed. Please try again.');
    }
    
    // Re-throw outros erros
    throw error;
  }
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

