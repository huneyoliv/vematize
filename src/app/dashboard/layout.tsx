import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';
import Sidebar from '@/components/layout/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Renderiza sidebar apropriada baseado no tipo de usuário
  const SidebarComponent = session.type === 'admin' ? Sidebar : TenantSidebar;
  
  return (
    <div className="flex min-h-screen">
      <SidebarComponent />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
