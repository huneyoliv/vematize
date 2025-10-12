import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[DashboardLayout] Starting...');
  
  const session = await getCurrentSession();
  
  console.log('[DashboardLayout] Session:', session ? { type: session.type, userId: session.userId } : 'NULL');

  if (!session) {
    console.log('[DashboardLayout] No session, redirecting to /login');
    redirect('/login');
  }

  // Admin é redirecionado para /krov/dashboard
  if (session.type === 'admin') {
    console.log('[DashboardLayout] Admin detected, redirecting to /krov/dashboard');
    redirect('/krov/dashboard');
  }

  console.log('[DashboardLayout] Rendering tenant dashboard');
  
  // Tenant usa o dashboard fixo (sem subdomain na URL)
  return (
    <div className="flex min-h-screen">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
