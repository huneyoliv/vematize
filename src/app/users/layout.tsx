import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';

/**
 * Layout para páginas de Usuários (somente tenants)
 * Admin é redirecionado para /dashboard
 */
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Usuários são apenas para tenants, admin vai para dashboard
  if (session.type === 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

