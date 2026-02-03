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

  // Admin vê as configurações do Krov (globais)
  if (session.type === 'admin') {
    const { default: AdminSettings } = await import('@/components/settings/admin-settings-page');
    return <AdminSettings />;
  }

  // Tenant vê as configurações do próprio tenant (Mercado Pago)
  // Importa dinamicamente para evitar conflito de rotas
  const { TenantSettingsContent } = await import('@/components/settings/tenant-settings-content');
  const subdomain = session.subdomain || '';
  return <TenantSettingsContent subdomain={subdomain} />;
}


