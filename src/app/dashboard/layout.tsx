import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Admin é redirecionado para /krov/dashboard
  if (session.type === 'admin') {
    redirect('/krov/dashboard');
  }

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
