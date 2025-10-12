import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';

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
  
  // Tenant usa o layout com sidebar
  return (
    <div className="flex min-h-screen">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

