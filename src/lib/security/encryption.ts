/**
 * Field-Level Encryption
 * 
 * Sistema de criptografia para dados sensíveis no banco de dados
 * usando AES-256-GCM (Galois/Counter Mode)
 * 
 * Dados que devem ser criptografados:
 * - Bot tokens (Discord, Telegram)
 * - API keys de pagamento
 * - Webhook secrets
 * - CPF/CNPJ
 * - Dados pessoais sensíveis
 */

import crypto from 'crypto';

// ==================== CONFIGURAÇÃO ====================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Para AES, sempre 16 bytes
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Validação da chave
if (!ENCRYPTION_KEY) {
  console.error('⚠️  ENCRYPTION_KEY não configurada!');
  console.error('⚠️  Gere uma chave com: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

// ==================== TIPOS ====================

export type EncryptedData = {
  encrypted: string; // base64
  iv: string; // base64
  authTag: string; // base64
};

// ==================== KEY DERIVATION ====================

/**
 * Deriva uma chave de criptografia a partir da chave mestre
 * Usa PBKDF2 para key stretching
 */
function deriveKey(salt: Buffer): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  return crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    salt,
    100000, // 100k iterações
    32, // 256 bits
    'sha256'
  );
}

// ==================== ENCRYPTION ====================

/**
 * Criptografa um valor usando AES-256-GCM
 * @param plaintext - Texto a ser criptografado
 * @returns Objeto com dados criptografados
 */
export function encrypt(plaintext: string): EncryptedData {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  // 1. Gera salt e deriva chave
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);

  // 2. Gera IV aleatório
  const iv = crypto.randomBytes(IV_LENGTH);

  // 3. Cria cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // 4. Criptografa
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // 5. Obtém auth tag
  const authTag = cipher.getAuthTag();

  // 6. Retorna dados (IV e authTag são necessários para descriptografar)
  return {
    encrypted: Buffer.concat([salt, Buffer.from(encrypted, 'base64')]).toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Descriptografa um valor
 * @param data - Dados criptografados
 * @returns Texto original
 */
export function decrypt(data: EncryptedData): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  try {
    // 1. Extrai salt e encrypted data
    const buffer = Buffer.from(data.encrypted, 'base64');
    const salt = buffer.subarray(0, SALT_LENGTH);
    const encryptedData = buffer.subarray(SALT_LENGTH);

    // 2. Deriva chave
    const key = deriveKey(salt);

    // 3. Converte IV e authTag
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');

    // 4. Cria decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // 5. Descriptografa
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ==================== HELPERS PARA CAMPOS ESPECÍFICOS ====================

/**
 * Criptografa token de bot
 */
export function encryptBotToken(token: string): EncryptedData {
  if (!token) {
    throw new Error('Token cannot be empty');
  }
  return encrypt(token);
}

/**
 * Descriptografa token de bot
 */
export function decryptBotToken(data: EncryptedData): string {
  return decrypt(data);
}

/**
 * Criptografa API key
 */
export function encryptApiKey(apiKey: string): EncryptedData {
  if (!apiKey) {
    throw new Error('API key cannot be empty');
  }
  return encrypt(apiKey);
}

/**
 * Descriptografa API key
 */
export function decryptApiKey(data: EncryptedData): string {
  return decrypt(data);
}

/**
 * Criptografa CPF/CNPJ
 */
export function encryptCpfCnpj(cpfCnpj: string): EncryptedData {
  if (!cpfCnpj) {
    throw new Error('CPF/CNPJ cannot be empty');
  }
  // Remove formatação antes de criptografar
  const cleaned = cpfCnpj.replace(/[^\d]/g, '');
  return encrypt(cleaned);
}

/**
 * Descriptografa CPF/CNPJ
 */
export function decryptCpfCnpj(data: EncryptedData): string {
  return decrypt(data);
}

// ==================== BULK OPERATIONS ====================

/**
 * Criptografa múltiplos campos de um objeto
 * @param obj - Objeto com campos a criptografar
 * @param fields - Lista de campos que devem ser criptografados
 * @returns Objeto com campos criptografados
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }

  return result;
}

/**
 * Descriptografa múltiplos campos de um objeto
 * @param obj - Objeto com campos criptografados
 * @param fields - Lista de campos que devem ser descriptografados
 * @returns Objeto com campos descriptografados
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'object') {
      try {
        result[field] = decrypt(result[field] as EncryptedData) as any;
      } catch (error) {
        console.error(`[ENCRYPTION] Failed to decrypt field ${String(field)}:`, error);
        // Mantém valor original se falhar
      }
    }
  }

  return result;
}

// ==================== VALIDATION ====================

/**
 * Verifica se um valor está criptografado
 */
export function isEncrypted(value: any): value is EncryptedData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'encrypted' in value &&
    'iv' in value &&
    'authTag' in value
  );
}

/**
 * Verifica se a chave de criptografia está configurada
 */
export function isEncryptionConfigured(): boolean {
  return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length >= 32;
}

// ==================== HASHING (ONE-WAY) ====================

/**
 * Hash one-way para dados que não precisam ser recuperados
 * Útil para tokens de verificação, etc.
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verifica se um valor corresponde a um hash
 */
export function verifyHash(data: string, hashValue: string): boolean {
  return hash(data) === hashValue;
}

// ==================== EXEMPLOS DE USO ====================

/*
// Exemplo 1: Criptografar token de bot antes de salvar
const encryptedToken = encryptBotToken(botToken);
await db.tenants.updateOne(
  { _id: tenantId },
  { $set: { 'connections.telegram.botToken': encryptedToken } }
);

// Exemplo 2: Descriptografar ao recuperar
const tenant = await db.tenants.findOne({ _id: tenantId });
const botToken = decryptBotToken(tenant.connections.telegram.botToken);

// Exemplo 3: Múltiplos campos
const encrypted = encryptFields(paymentData, ['apiKey', 'secretKey', 'webhookSecret']);
await db.paymentSettings.insertOne(encrypted);

// Exemplo 4: Verificar se está configurado
if (!isEncryptionConfigured()) {
  console.error('Encryption not properly configured!');
}
*/

