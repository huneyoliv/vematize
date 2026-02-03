/**
 * Audit Logs System
 * 
 * Sistema de auditoria para rastrear ações críticas e sensíveis
 * no sistema, permitindo compliance e investigação de incidentes.
 * 
 * Ações rastreadas:
 * - Autenticação (login, logout, falhas)
 * - Mudanças de permissões
 * - Operações financeiras
 * - Alterações de configurações críticas
 * - Acesso a dados sensíveis
 * - Exclusões de dados
 */

import clientPromise from '@/lib/mongodb';
import type { ObjectId } from 'mongodb';

// ==================== TIPOS ====================

export type AuditAction =
  // Autenticação
  | 'login.success'
  | 'login.failed'
  | 'logout'
  | 'password.changed'
  | 'password.reset'
  | '2fa.enabled'
  | '2fa.disabled'
  
  // Usuários e Permissões
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'permissions.changed'
  
  // Tenant Management
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deleted'
  | 'tenant.suspended'
  | 'tenant.reactivated'
  
  // Bots
  | 'bot.connected'
  | 'bot.disconnected'
  | 'bot.token.changed'
  | 'bot.config.updated'
  
  // Produtos e Vendas
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'sale.completed'
  | 'sale.refunded'
  
  // Pagamentos
  | 'payment.gateway.connected'
  | 'payment.gateway.updated'
  | 'payment.gateway.disconnected'
  | 'webhook.secret.changed'
  
  // Configurações
  | 'settings.updated'
  | 'api.key.generated'
  | 'api.key.revoked'
  
  // Segurança
  | 'security.rate_limit_exceeded'
  | 'security.unauthorized_access'
  | 'security.suspicious_activity'
  | 'security.data_breach_attempt';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditLogEntry = {
  _id?: ObjectId;
  
  // Quem?
  actorId: string; // userId ou 'system'
  actorType: 'user' | 'admin' | 'system' | 'api';
  actorEmail?: string;
  
  // O quê?
  action: AuditAction;
  severity: AuditSeverity;
  
  // Onde?
  resource?: string; // Ex: 'product:123', 'tenant:456'
  resourceType?: string; // Ex: 'product', 'tenant', 'user'
  
  // Quando?
  timestamp: Date;
  
  // Como?
  ip?: string;
  userAgent?: string;
  
  // Contexto
  details?: Record<string, any>;
  
  // Resultado
  success: boolean;
  errorMessage?: string;
  
  // Tenant (para multi-tenancy)
  tenantId?: string;
};

// ==================== AUDIT LOGGER ====================

/**
 * Registra uma ação no log de auditoria
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, '_id' | 'timestamp'>): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const auditLogsCollection = db.collection('audit_logs');

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    await auditLogsCollection.insertOne(logEntry);

    // Log crítico também no console
    if (entry.severity === 'critical' || entry.severity === 'error') {
      console.error('[AUDIT]', {
        action: entry.action,
        severity: entry.severity,
        actor: entry.actorEmail || entry.actorId,
        success: entry.success,
      });
    }
  } catch (error) {
    console.error('[AUDIT] Failed to log audit event:', error);
    // Não falha a operação principal se o log de auditoria falhar
  }
}

// ==================== HELPERS ESPECÍFICOS ====================

/**
 * Log de autenticação
 */
export async function logAuthEvent(params: {
  action: 'login.success' | 'login.failed' | 'logout';
  userId?: string;
  email: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  errorMessage?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId || 'anonymous',
    actorType: 'user',
    actorEmail: params.email,
    action: params.action,
    severity: params.success ? 'info' : 'warning',
    success: params.success,
    ip: params.ip,
    userAgent: params.userAgent,
    errorMessage: params.errorMessage,
  });
}

/**
 * Log de mudança de senha
 */
export async function logPasswordChange(params: {
  userId: string;
  email: string;
  success: boolean;
  ip?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId,
    actorType: 'user',
    actorEmail: params.email,
    action: 'password.changed',
    severity: 'warning', // Sempre warning para mudanças de senha
    success: params.success,
    ip: params.ip,
  });
}

/**
 * Log de operações em produtos
 */
export async function logProductAction(params: {
  action: 'product.created' | 'product.updated' | 'product.deleted';
  userId: string;
  tenantId: string;
  productId: string;
  productName: string;
  changes?: Record<string, any>;
  ip?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId,
    actorType: 'user',
    action: params.action,
    severity: params.action === 'product.deleted' ? 'warning' : 'info',
    resource: `product:${params.productId}`,
    resourceType: 'product',
    tenantId: params.tenantId,
    success: true,
    ip: params.ip,
    details: {
      productName: params.productName,
      changes: params.changes,
    },
  });
}

/**
 * Log de vendas
 */
export async function logSaleEvent(params: {
  action: 'sale.completed' | 'sale.refunded';
  tenantId: string;
  saleId: string;
  productId: string;
  amount: number;
  gateway: string;
  customerId?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: 'system',
    actorType: 'system',
    action: params.action,
    severity: params.action === 'sale.refunded' ? 'warning' : 'info',
    resource: `sale:${params.saleId}`,
    resourceType: 'sale',
    tenantId: params.tenantId,
    success: true,
    details: {
      productId: params.productId,
      amount: params.amount,
      gateway: params.gateway,
      customerId: params.customerId,
    },
  });
}

/**
 * Log de mudanças em configurações de bot
 */
export async function logBotConfigChange(params: {
  action: 'bot.connected' | 'bot.disconnected' | 'bot.token.changed' | 'bot.config.updated';
  userId: string;
  tenantId: string;
  platform: string;
  ip?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId,
    actorType: 'user',
    action: params.action,
    severity: params.action.includes('token') ? 'warning' : 'info',
    resource: `bot:${params.platform}`,
    resourceType: 'bot',
    tenantId: params.tenantId,
    success: true,
    ip: params.ip,
    details: {
      platform: params.platform,
    },
  });
}

/**
 * Log de mudanças em gateway de pagamento
 */
export async function logPaymentGatewayChange(params: {
  action: 'payment.gateway.connected' | 'payment.gateway.updated' | 'payment.gateway.disconnected';
  userId: string;
  tenantId: string;
  gateway: string;
  ip?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId,
    actorType: 'user',
    action: params.action,
    severity: 'warning', // Sempre warning para mudanças em pagamento
    resource: `payment:${params.gateway}`,
    resourceType: 'payment',
    tenantId: params.tenantId,
    success: true,
    ip: params.ip,
    details: {
      gateway: params.gateway,
    },
  });
}

/**
 * Log de eventos de segurança
 */
export async function logSecurityEvent(params: {
  action: 'security.rate_limit_exceeded' | 'security.unauthorized_access' | 'security.suspicious_activity' | 'security.data_breach_attempt';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.userId || 'anonymous',
    actorType: 'user',
    action: params.action,
    severity: 'critical',
    success: false,
    ip: params.ip,
    userAgent: params.userAgent,
    details: params.details,
  });
}

/**
 * Log de mudanças em tenant (admin)
 */
export async function logTenantChange(params: {
  action: 'tenant.created' | 'tenant.updated' | 'tenant.deleted' | 'tenant.suspended' | 'tenant.reactivated';
  adminId: string;
  tenantId: string;
  changes?: Record<string, any>;
  ip?: string;
}): Promise<void> {
  await logAuditEvent({
    actorId: params.adminId,
    actorType: 'admin',
    action: params.action,
    severity: params.action.includes('deleted') || params.action.includes('suspended') ? 'warning' : 'info',
    resource: `tenant:${params.tenantId}`,
    resourceType: 'tenant',
    success: true,
    ip: params.ip,
    details: {
      changes: params.changes,
    },
  });
}

// ==================== QUERY HELPERS ====================

/**
 * Busca logs de auditoria com filtros
 */
export async function queryAuditLogs(filters: {
  actorId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const auditLogsCollection = db.collection<AuditLogEntry>('audit_logs');

  const query: any = {};

  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.action) query.action = filters.action;
  if (filters.severity) query.severity = filters.severity;
  if (filters.tenantId) query.tenantId = filters.tenantId;
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }

  return await auditLogsCollection
    .find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .toArray();
}

/**
 * Obtém estatísticas de auditoria
 */
export async function getAuditStats(tenantId?: string): Promise<{
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  recentEvents: number;
}> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const auditLogsCollection = db.collection<AuditLogEntry>('audit_logs');

  const baseQuery = tenantId ? { tenantId } : {};
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [total, critical, failedLogins, recent] = await Promise.all([
    auditLogsCollection.countDocuments(baseQuery),
    auditLogsCollection.countDocuments({ ...baseQuery, severity: 'critical' }),
    auditLogsCollection.countDocuments({ ...baseQuery, action: 'login.failed' }),
    auditLogsCollection.countDocuments({ ...baseQuery, timestamp: { $gte: last24h } }),
  ]);

  return {
    totalEvents: total,
    criticalEvents: critical,
    failedLogins,
    recentEvents: recent,
  };
}

// ==================== CLEANUP ====================

/**
 * Remove logs antigos (deve ser executado por cron job)
 * @param daysToKeep - Dias de retenção dos logs
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const client = await clientPromise;
  const db = client.db('vematize');
  const auditLogsCollection = db.collection('audit_logs');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await auditLogsCollection.deleteMany({
    timestamp: { $lt: cutoffDate },
    severity: { $nin: ['critical', 'error'] }, // Mantém eventos críticos/erro por mais tempo
  });

  console.log(`[AUDIT] Removed ${result.deletedCount} old audit logs`);
  return result.deletedCount;
}

