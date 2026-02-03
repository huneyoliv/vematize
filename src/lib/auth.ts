import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export type SessionData = {
    userId: string;
    email: string;
    name: string;
    subdomain?: string; // For tenant users
    type: 'admin' | 'tenant';
    subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'canceled' | 'pending_setup';
    createdAt: Date;
    expiresAt: Date;
};

// Gera um token seguro
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Cria uma sessão e retorna o token
export async function createSession(data: Omit<SessionData, 'createdAt' | 'expiresAt'>): Promise<string> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Sessão expira em 7 dias

    await sessionsCollection.insertOne({
        token,
        ...data,
        createdAt: new Date(),
        expiresAt,
    });

    return token;
}

// Valida e retorna os dados da sessão
export async function getSession(token?: string): Promise<SessionData | null> {
    if (!token) return null;

    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    const session = await sessionsCollection.findOne({
        token,
        expiresAt: { $gt: new Date() }, // Verifica se não expirou
    });

    if (!session) return null;

    return {
        userId: session.userId,
        email: session.email,
        name: session.name,
        subdomain: session.subdomain,
        type: session.type,
        subscriptionStatus: session.subscriptionStatus,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
    };
}

// Obtém a sessão do usuário atual
export async function getCurrentSession(): Promise<SessionData | null> {
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;
    return getSession(token);
}

// Deleta uma sessão
export async function deleteSession(token: string): Promise<void> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    await sessionsCollection.deleteOne({ token });
}

// Deleta todas as sessões de um usuário
export async function deleteAllUserSessions(userId: string): Promise<void> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    await sessionsCollection.deleteMany({ userId });
}

// Limpa sessões expiradas (pode ser chamado por um cron job)
export async function cleanExpiredSessions(): Promise<void> {
    const client = await clientPromise;
    const db = client.db('vematize');
    const sessionsCollection = db.collection('sessions');

    await sessionsCollection.deleteMany({
        expiresAt: { $lt: new Date() },
    });
}

// Middleware helper para verificar autenticação
export async function requireAuth(type?: 'admin' | 'tenant'): Promise<SessionData> {
    const session = await getCurrentSession();

    if (!session) {
        throw new Error('Unauthorized');
    }

    if (type && session.type !== type) {
        throw new Error('Forbidden');
    }

    return session;
}

// Helper para verificar se o usuário tem acesso a um subdomain específico
export async function requireTenantAccess(subdomain: string): Promise<SessionData> {
    const session = await getCurrentSession();

    // Se não há sessão, lança Unauthorized
    if (!session) {
        console.error('[requireTenantAccess] No session found');
        throw new Error('Unauthorized');
    }

    // Admin tem acesso a todos os subdomains
    if (session.type === 'admin') {
        return session;
    }

    // Tenant precisa ter subdomain definido
    if (session.type === 'tenant' && !session.subdomain) {
        console.error('[requireTenantAccess] Tenant session without subdomain:', session);
        throw new Error('Invalid session: subdomain missing');
    }

    // Tenant só tem acesso ao próprio subdomain
    if (session.type === 'tenant' && session.subdomain !== subdomain) {
        console.error(`[requireTenantAccess] Access denied: ${session.email} tried to access ${subdomain} but owns ${session.subdomain}`);
        throw new Error('Forbidden');
    }

    return session;
}

// Helper para verificar se é admin
export async function requireAdminAuth(): Promise<SessionData> {
    return requireAuth('admin');
}



