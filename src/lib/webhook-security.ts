/**
 * Utilitários de Segurança para Webhooks
 */

import clientPromise from './mongodb';
import { Tenant } from './types';

export interface WebhookSecurityAlert {
  tenantId: string;
  subdomain: string;
  alertType: 'untrusted_webhook_payment' | 'missing_signature' | 'rate_limit_exceeded';
  severity: 'critical' | 'high' | 'medium';
  details: any;
  timestamp: Date;
}

/**
 * Registra alerta de segurança para webhook não confiável
 */
export async function logWebhookSecurityAlert(alert: WebhookSecurityAlert): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    
    await db.collection('webhook_security_alerts').insertOne({
      ...alert,
      timestamp: new Date(),
    });

    // Log no console também para monitoramento imediato
    console.error('🚨 [WEBHOOK SECURITY ALERT]', {
      type: alert.alertType,
      severity: alert.severity,
      subdomain: alert.subdomain,
      details: alert.details,
    });
  } catch (error) {
    console.error('Failed to log webhook security alert:', error);
  }
}

/**
 * Verifica se tenant deve ser marcado como não confiável
 */
export async function checkAndMarkUntrustedWebhook(
  tenant: Tenant,
  hasSecret: boolean
): Promise<boolean> {
  if (hasSecret) {
    return false; // Webhook confiável
  }

  const client = await clientPromise;
  const db = client.db('vematize');

  // Marcar tenant como não confiável se ainda não estiver marcado
  if (!tenant.webhooks?.untrusted) {
    await db.collection('tenants').updateOne(
      { _id: tenant._id },
      {
        $set: {
          'webhooks.untrusted': true,
          'webhooks.lastUntrustedAlert': new Date(),
        },
      }
    );

    console.warn(`[WEBHOOK SECURITY] Tenant ${tenant.subdomain} marcado como webhooks.untrusted = true (sem secret configurado)`);
  }

  return true; // É não confiável
}

/**
 * Verifica se deve mostrar banner de alerta no painel
 */
export function shouldShowWebhookAlert(tenant: Tenant): boolean {
  if (!tenant.webhooks?.untrusted) {
    return false;
  }

  // Mostrar alerta se:
  // 1. Nunca foi mostrado antes
  // 2. Última vez foi há mais de 24 horas
  const lastAlert = tenant.webhooks?.lastUntrustedAlert;
  if (!lastAlert) {
    return true;
  }

  const hoursSinceLastAlert = (Date.now() - new Date(lastAlert).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastAlert >= 24;
}

/**
 * Atualiza timestamp do último alerta mostrado
 */
export async function updateWebhookAlertTimestamp(tenantId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db('vematize');

  await db.collection('tenants').updateOne(
    { _id: tenantId } as any,
    {
      $set: {
        'webhooks.lastUntrustedAlert': new Date(),
      },
    }
  );
}

/**
 * Validação de tamanho do payload
 */
export function validatePayloadSize(contentLength: string | null, maxSizeBytes: number = 1048576): boolean {
  if (!contentLength) {
    return true; // Sem Content-Length, permitir (será validado no parsing)
  }

  const size = parseInt(contentLength);
  if (isNaN(size)) {
    return false;
  }

  return size <= maxSizeBytes;
}

/**
 * Extrai informações de debugging do request
 */
export function extractRequestInfo(request: Request): {
  ip: string;
  userAgent: string;
  contentLength: string;
  timestamp: string;
} {
  const headers = request.headers;
  
  return {
    ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    contentLength: headers.get('content-length') || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

