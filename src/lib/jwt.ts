/**
 * JWT Authentication System
 * Implementa access tokens de curta duração e refresh tokens de longa duração
 * com rotação automática e blacklist para segurança máxima
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';

// ==================== CONFIGURAÇÃO ====================

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

// Access token: 15 minutos (curta duração para segurança)
const ACCESS_TOKEN_EXPIRY = '15m';

// Refresh token: 7 dias
const REFRESH_TOKEN_EXPIRY = '7d';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT_SECRET ou JWT_REFRESH_SECRET não configurados! Usando valores temporários.');
  console.warn('⚠️  Configure estas variáveis de ambiente em produção!');
}

// ==================== TIPOS ====================

export type JWTPayload = {
  userId: string;
  email: string;
  name: string;
  subdomain?: string;
  type: 'admin' | 'tenant';
  iat?: number;
  exp?: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

export type RefreshTokenDocument = {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
  deviceInfo?: string;
};

// ==================== GERAÇÃO DE TOKENS ====================

/**
 * Gera um par de tokens (access + refresh)
 */
export async function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair> {
  // Access token (curta duração)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });

  // Refresh token (longa duração)
  const refreshToken = jwt.sign(
    { userId: payload.userId, type: payload.type },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    }
  );

  // Salvar refresh token no banco para controle
  const client = await clientPromise;
  const db = client.db('vematize');
  const refreshTokensCollection = db.collection('refresh_tokens');

  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);

  await refreshTokensCollection.insertOne({
    token: refreshToken,
    userId: payload.userId,
    createdAt: new Date(),
    expiresAt: refreshTokenExpiresAt,
    revoked: false,
  });

  const accessTokenExpiresAt = new Date();
  accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

// ==================== VALIDAÇÃO DE TOKENS ====================

/**
 * Verifica e decodifica um access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Access token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('[JWT] Access token inválido:', error.message);
    }
    return null;
  }
}

/**
 * Verifica e decodifica um refresh token
 * Também verifica se o token não foi revogado
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    // 1. Verificar assinatura
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;

    // 2. Verificar se não está na blacklist
    const client = await clientPromise;
    const db = client.db('vematize');
    const refreshTokensCollection = db.collection('refresh_tokens');

    const tokenDoc = await refreshTokensCollection.findOne({
      token,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      console.warn('[JWT] Refresh token revogado ou não encontrado');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Refresh token expirado');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('[JWT] Refresh token inválido:', error.message);
    }
    return null;
  }
}

// ==================== ROTAÇÃO DE TOKENS ====================

/**
 * Rotaciona o refresh token (gera um novo par de tokens e revoga o antigo)
 * Esta é uma medida de segurança importante!
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair | null> {
  // 1. Validar o refresh token antigo
  const decoded = await verifyRefreshToken(oldRefreshToken);

  if (!decoded) {
    return null;
  }

  // 2. Buscar informações completas do usuário
  const client = await clientPromise;
  const db = client.db('vematize');

  let userPayload: Omit<JWTPayload, 'iat' | 'exp'>;

  if (decoded.type === 'admin') {
    const admin = await db.collection('admins').findOne({ _id: decoded.userId } as any);
    if (!admin) return null;

    userPayload = {
      userId: admin._id.toString(),
      email: admin.email || admin.username,
      name: admin.username,
      type: 'admin',
    };
  } else {
    const tenant = await db.collection('tenants').findOne({ _id: decoded.userId } as any);
    if (!tenant) return null;

    userPayload = {
      userId: tenant._id.toString(),
      email: tenant.ownerEmail,
      name: tenant.ownerName || 'Cliente',
      subdomain: tenant.subdomain || tenant.username,
      type: 'tenant',
    };
  }

  // 3. Revogar o refresh token antigo
  await revokeRefreshToken(oldRefreshToken);

  // 4. Gerar novo par de tokens
  return generateTokenPair(userPayload);
}

// ==================== REVOGAÇÃO DE TOKENS ====================

/**
 * Revoga um refresh token específico
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const refreshTokensCollection = db.collection('refresh_tokens');

  await refreshTokensCollection.updateOne(
    { token },
    { $set: { revoked: true, revokedAt: new Date() } }
  );

  console.log('[JWT] Refresh token revogado');
}

/**
 * Revoga todos os refresh tokens de um usuário (útil para logout geral)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const refreshTokensCollection = db.collection('refresh_tokens');

  const result = await refreshTokensCollection.updateMany(
    { userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );

  console.log(`[JWT] ${result.modifiedCount} refresh tokens revogados para usuário ${userId}`);
}

// ==================== LIMPEZA ====================

/**
 * Remove refresh tokens expirados do banco
 * Deve ser executado periodicamente (cron job)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const refreshTokensCollection = db.collection('refresh_tokens');

  const result = await refreshTokensCollection.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  console.log(`[JWT] ${result.deletedCount} refresh tokens expirados removidos`);
}

