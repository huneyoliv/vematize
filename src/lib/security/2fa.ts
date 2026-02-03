/**
 * Two-Factor Authentication (2FA) System
 * 
 * Implementação de 2FA usando TOTP (Time-based One-Time Password)
 * compatível com Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import clientPromise from '@/lib/mongodb';

// ==================== CONFIGURAÇÃO ====================

// Configurações do TOTP
authenticator.options = {
  window: 1, // Aceita tokens de 1 janela antes/depois (30s cada)
  step: 30, // Novo código a cada 30 segundos
};

const APP_NAME = process.env.APP_NAME || 'Vematize';

// ==================== TIPOS ====================

export type TwoFactorSetup = {
  secret: string;
  qrCode: string; // Data URL da imagem QR
  backupCodes: string[];
};

export type TwoFactorStatus = {
  enabled: boolean;
  verified: boolean;
  backupCodesRemaining?: number;
};

// ==================== GERAÇÃO E SETUP ====================

/**
 * Gera configuração de 2FA para um usuário
 * @param userId - ID do usuário
 * @param email - Email do usuário
 * @returns Configuração com secret, QR code e backup codes
 */
export async function generate2FASetup(
  userId: string,
  email: string
): Promise<TwoFactorSetup> {
  // 1. Gera secret
  const secret = authenticator.generateSecret();

  // 2. Gera otpauth URL
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);

  // 3. Gera QR Code
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  // 4. Gera backup codes (10 códigos de 8 dígitos)
  const backupCodes = generateBackupCodes(10);

  // 5. Salva no banco (ainda não ativado)
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  await twoFactorCollection.updateOne(
    { userId },
    {
      $set: {
        secret,
        enabled: false,
        verified: false,
        backupCodes: backupCodes.map(code => ({
          code,
          used: false,
        })),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    secret,
    qrCode,
    backupCodes,
  };
}

/**
 * Gera códigos de backup
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Gera código de 8 dígitos
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }

  return codes;
}

// ==================== VERIFICAÇÃO ====================

/**
 * Verifica código TOTP ou backup code
 * @param userId - ID do usuário
 * @param token - Código de 6 dígitos ou backup code de 8 dígitos
 * @returns True se válido
 */
export async function verify2FAToken(
  userId: string,
  token: string
): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  const twoFactorData = await twoFactorCollection.findOne({ userId });

  if (!twoFactorData) {
    return false;
  }

  // Verifica se é um código TOTP (6 dígitos)
  if (token.length === 6) {
    return authenticator.verify({
      token,
      secret: twoFactorData.secret,
    });
  }

  // Verifica se é um backup code (8 dígitos)
  if (token.length === 8) {
    const backupCode = twoFactorData.backupCodes?.find(
      (bc: any) => bc.code === token && !bc.used
    );

    if (backupCode) {
      // Marca código como usado
      await twoFactorCollection.updateOne(
        { userId, 'backupCodes.code': token },
        { $set: { 'backupCodes.$.used': true } }
      );

      return true;
    }
  }

  return false;
}

/**
 * Ativa 2FA após primeira verificação bem-sucedida
 * @param userId - ID do usuário
 * @param token - Código de verificação
 * @returns True se ativado com sucesso
 */
export async function enable2FA(userId: string, token: string): Promise<boolean> {
  // 1. Verifica token
  const isValid = await verify2FAToken(userId, token);

  if (!isValid) {
    return false;
  }

  // 2. Ativa 2FA
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  await twoFactorCollection.updateOne(
    { userId },
    {
      $set: {
        enabled: true,
        verified: true,
        enabledAt: new Date(),
      },
    }
  );

  return true;
}

/**
 * Desativa 2FA
 * Requer verificação de senha ou código de backup
 * @param userId - ID do usuário
 * @param verificationToken - Código TOTP ou backup para confirmar
 * @returns True se desativado com sucesso
 */
export async function disable2FA(
  userId: string,
  verificationToken: string
): Promise<boolean> {
  // 1. Verifica token para confirmar
  const isValid = await verify2FAToken(userId, verificationToken);

  if (!isValid) {
    return false;
  }

  // 2. Desativa 2FA
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  await twoFactorCollection.deleteOne({ userId });

  return true;
}

// ==================== STATUS ====================

/**
 * Obtém status de 2FA do usuário
 * @param userId - ID do usuário
 * @returns Status do 2FA
 */
export async function get2FAStatus(userId: string): Promise<TwoFactorStatus> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  const twoFactorData = await twoFactorCollection.findOne({ userId });

  if (!twoFactorData) {
    return {
      enabled: false,
      verified: false,
    };
  }

  const backupCodesRemaining = twoFactorData.backupCodes?.filter(
    (bc: any) => !bc.used
  ).length || 0;

  return {
    enabled: twoFactorData.enabled,
    verified: twoFactorData.verified,
    backupCodesRemaining,
  };
}

/**
 * Regenera backup codes
 * @param userId - ID do usuário
 * @param verificationToken - Código para confirmar
 * @returns Novos backup codes ou null se falhar
 */
export async function regenerateBackupCodes(
  userId: string,
  verificationToken: string
): Promise<string[] | null> {
  // 1. Verifica token
  const isValid = await verify2FAToken(userId, verificationToken);

  if (!isValid) {
    return null;
  }

  // 2. Gera novos códigos
  const newBackupCodes = generateBackupCodes(10);

  // 3. Atualiza no banco
  const client = await clientPromise;
  const db = client.db('vematize');
  const twoFactorCollection = db.collection('two_factor_auth');

  await twoFactorCollection.updateOne(
    { userId },
    {
      $set: {
        backupCodes: newBackupCodes.map(code => ({
          code,
          used: false,
        })),
        backupCodesRegeneratedAt: new Date(),
      },
    }
  );

  return newBackupCodes;
}

// ==================== MIDDLEWARE HELPERS ====================

/**
 * Verifica se usuário precisa de 2FA
 * Para uso em middleware de autenticação
 */
export async function requires2FA(userId: string): Promise<boolean> {
  const status = await get2FAStatus(userId);
  return status.enabled && status.verified;
}

/**
 * Marca sessão como verificada com 2FA
 * Para uso após login bem-sucedido com 2FA
 */
export async function mark2FAVerified(sessionToken: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const sessionsCollection = db.collection('sessions');

  await sessionsCollection.updateOne(
    { token: sessionToken },
    { $set: { twoFactorVerified: true } }
  );
}

/**
 * Verifica se sessão foi verificada com 2FA
 */
export async function isSession2FAVerified(sessionToken: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const sessionsCollection = db.collection('sessions');

  const session = await sessionsCollection.findOne({ token: sessionToken });
  return session?.twoFactorVerified === true;
}

// ==================== OPERAÇÕES SENSÍVEIS ====================

/**
 * Verifica 2FA para operações sensíveis
 * Usado em alterações críticas (deletar conta, mudar senha, etc)
 * @param userId - ID do usuário
 * @param token - Código de verificação
 * @param operation - Nome da operação (para logging)
 * @returns True se verificado
 */
export async function verify2FAForSensitiveOperation(
  userId: string,
  token: string,
  operation: string
): Promise<boolean> {
  const status = await get2FAStatus(userId);

  // Se 2FA não está ativo, permite operação
  if (!status.enabled) {
    return true;
  }

  // Se 2FA está ativo, requer verificação
  const isValid = await verify2FAToken(userId, token);

  if (isValid) {
    console.log(`[2FA] Sensitive operation verified: ${operation} for user ${userId}`);
  } else {
    console.warn(`[2FA] Failed verification for sensitive operation: ${operation} for user ${userId}`);
  }

  return isValid;
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Setup inicial de 2FA
export async function setupTwoFactor(userId: string, email: string) {
  const setup = await generate2FASetup(userId, email);
  
  return {
    qrCode: setup.qrCode,
    backupCodes: setup.backupCodes,
    // Não expor o secret!
  };
}

// Exemplo 2: Verificação no login
export async function loginWithTwoFactor(email: string, password: string, token?: string) {
  // ... verifica email e senha ...
  
  const requires2fa = await requires2FA(userId);
  
  if (requires2fa && !token) {
    return {
      success: false,
      requires2FA: true,
      message: 'Código 2FA necessário',
    };
  }
  
  if (requires2fa) {
    const isValid = await verify2FAToken(userId, token!);
    if (!isValid) {
      return {
        success: false,
        message: 'Código 2FA inválido',
      };
    }
  }
  
  // ... cria sessão ...
  if (requires2fa) {
    await mark2FAVerified(sessionToken);
  }
  
  return { success: true };
}

// Exemplo 3: Operação sensível
export async function deleteAccount(userId: string, twoFactorToken: string) {
  const verified = await verify2FAForSensitiveOperation(
    userId,
    twoFactorToken,
    'account_deletion'
  );
  
  if (!verified) {
    return { success: false, message: 'Verificação 2FA falhou' };
  }
  
  // ... delete account logic ...
}
*/

