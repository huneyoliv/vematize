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
  console.log('[TenantLayout] Starting...');
  
  const session = await getCurrentSession();
  
  console.log('[TenantLayout] Session:', session ? { type: session.type, userId: session.userId } : 'NULL');

  if (!session) {
    console.log('[TenantLayout] No session, redirecting to /login');
    redirect('/login');
  }

  // Admin é redirecionado para /krov/dashboard
  if (session.type === 'admin') {
    console.log('[TenantLayout] Admin detected, redirecting to /krov/dashboard');
    redirect('/krov/dashboard');
  }

  console.log('[TenantLayout] Rendering tenant layout');
  
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

