import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Página de configurações adaptativa
 * Admin: Vê configurações globais (planos SaaS, pagamento global, segurança)
 * Tenant: Vê configurações do seu tenant (Mercado Pago, webhooks)
 */
export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Redireciona para a página apropriada baseado no tipo de usuário
  if (session.type === 'admin') {
    // Admin vê as configurações do Krov
    const { default: AdminSettings } = await import('@/app/krov/settings/page');
    return <AdminSettings />;
  }

  // Tenant vê as configurações do próprio tenant
  const { default: TenantSettings } = await import('@/app/(tenant)/settings/page');
  return <TenantSettings />;
}

