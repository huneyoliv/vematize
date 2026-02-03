import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

/**
 * Layout compartilhado para todas as rotas de tenant
 * Este grupo de rotas (tenant) inclui: dashboard, settings, bots, products, users, plan
 */
export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Este layout é apenas para TENANTS
  // Se for admin acessando uma rota tenant (como /settings), redireciona para /dashboard
  if (session.type === 'admin') {
    redirect('/dashboard');
  }

  // Se o tenant ainda não completou o setup, redireciona para setup-account
  if (session.subscriptionStatus === 'pending_setup') {
    redirect('/setup-account');
  }

  // Tenant usa o layout com sidebar unificada
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userType="tenant" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}

