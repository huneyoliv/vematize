'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { ClientLoginSchema } from '@/lib/schemas';
import type { Tenant } from '@/lib/types';
import { ObjectId } from 'mongodb';

type TenantDocument = Omit<Tenant, '_id' | 'ownerName'> & { _id: ObjectId, ownerName?: string, subdomain: string };

// Resultado unificado de login
type UnifiedLoginSuccess = {
  success: true;
  message: string;
  name: string;
  email: string;
  userType: 'admin' | 'tenant';
  redirectTo: string;
  subdomain?: string; // Apenas para tenants
};

type UnifiedLoginError = {
  success: false;
  message: string;
};

export type UnifiedLoginResult = UnifiedLoginSuccess | UnifiedLoginError;

// Schema unificado que aceita username
const UnifiedLoginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

/**
 * Login Unificado - Detecta automaticamente se é admin ou tenant
 * Prioridade: Tenta admin primeiro, depois tenant
 */
export async function unifiedLogin(
  values: z.infer<typeof UnifiedLoginSchema>
): Promise<UnifiedLoginResult> {
  try {
    const validatedData = UnifiedLoginSchema.parse(values);
    const client = await clientPromise;
    const db = client.db('vematize');

    // 1️⃣ TENTATIVA 1: LOGIN COMO ADMIN
    const adminCollection = db.collection('admins');
    
    // Verifica setup inicial (admin/admin)
    const adminCount = await adminCollection.countDocuments();
    if (adminCount === 0 && validatedData.username === 'admin' && validatedData.password === 'admin') {
      // Setup inicial - criar admin temporário
      const { createSession } = await import('@/lib/auth');
      const tempAdminId = new ObjectId();
      
      const token = await createSession({
        userId: tempAdminId.toString(),
        email: 'admin',
        name: 'Administrador',
        type: 'admin',
      });

      const { cookies } = await import('next/headers');
      cookies().set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

        return {
          success: true,
          message: 'Setup inicial - Configure sua conta de administrador',
          name: 'Administrador',
          email: 'admin',
          userType: 'admin',
          redirectTo: '/dashboard',
        };
    }

    // Tenta login como admin
    const admin = await adminCollection.findOne({ 
      username: validatedData.username
    });

    if (admin) {
      const isPasswordValid = await bcrypt.compare(validatedData.password, admin.password);
      
      if (isPasswordValid) {
        // ✅ LOGIN ADMIN BEM-SUCEDIDO
        const { createSession } = await import('@/lib/auth');
        const token = await createSession({
          userId: admin._id.toString(),
          email: admin.email || admin.username,
          name: admin.username,
          type: 'admin',
        });

        const { cookies } = await import('next/headers');
        cookies().set('session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });

        return {
          success: true,
          message: 'Login de administrador bem-sucedido!',
          name: admin.username,
          email: admin.email || admin.username,
          userType: 'admin',
          redirectTo: '/dashboard',
        };
      }
    }

    // 2️⃣ TENTATIVA 2: LOGIN COMO TENANT
    const tenantsCollection = db.collection<TenantDocument>('tenants');
    const tenant = await tenantsCollection.findOne({ username: validatedData.username });

    if (tenant && tenant.passwordHash) {
      const isPasswordValid = await bcrypt.compare(validatedData.password, tenant.passwordHash);

      if (isPasswordValid) {
        // ✅ LOGIN TENANT BEM-SUCEDIDO
        const { createSession } = await import('@/lib/auth');
        const token = await createSession({
          userId: tenant._id.toString(),
          email: tenant.ownerEmail,
          name: tenant.ownerName || 'Cliente',
          username: tenant.username,
          subdomain: tenant.subdomain || tenant.username, // Compatibilidade
          type: 'tenant',
        });

        const { cookies } = await import('next/headers');
        cookies().set('session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });

        return {
          success: true,
          message: 'Login bem-sucedido!',
          name: tenant.ownerName || 'Cliente',
          email: tenant.ownerEmail,
          userType: 'tenant',
          redirectTo: '/dashboard',
          subdomain: tenant.username, // Retorna username (compatibilidade com código existente)
        };
      }
    }

    // ❌ Nenhuma credencial válida encontrada
    return { 
      success: false, 
      message: 'Username ou senha inválidos.' 
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Unified login error:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

// Mantém a função antiga para compatibilidade (deprecated)
type LoginResultSuccess = {
  success: true;
  message: string;
  name: string;
  email: string;
  subdomain: string;
};

type LoginResultError = {
  success: false;
  message: string;
};

type LoginResult = LoginResultSuccess | LoginResultError;

/** @deprecated Use unifiedLogin() instead */
export async function loginClient(
  values: z.infer<typeof ClientLoginSchema>
): Promise<LoginResult> {
  try {
    const validatedData = ClientLoginSchema.parse(values);

    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection<TenantDocument>('tenants');

    // Busca por username (novo sistema)
    const tenant = await tenantsCollection.findOne({ 
      $or: [
        { username: validatedData.username },
        { subdomain: validatedData.username }
      ]
    });

    if (!tenant || !tenant.passwordHash) {
      return { success: false, message: 'Username ou senha inválidos.' };
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      tenant.passwordHash
    );

    if (!isPasswordValid) {
      return { success: false, message: 'Username ou senha inválidos.' };
    }

    // Cria sessão segura server-side
    const { createSession } = await import('@/lib/auth');
    const token = await createSession({
      userId: tenant._id.toString(),
      email: tenant.ownerEmail,
      name: tenant.ownerName || 'Cliente',
      subdomain: tenant.subdomain,
      type: 'tenant',
    });

    // Define cookie httpOnly seguro
    const { cookies } = await import('next/headers');
    cookies().set('session_token', token, {
      httpOnly: true, // Não acessível via JavaScript
      secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
      sameSite: 'strict', // Proteção contra CSRF
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });
    
    return { 
        success: true,
        message: 'Login bem-sucedido!',
        name: tenant.ownerName || 'Cliente', // Fallback for old accounts
        email: tenant.ownerEmail,
        subdomain: tenant.subdomain,
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Client login error:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}
