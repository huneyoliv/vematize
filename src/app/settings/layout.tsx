import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TenantSidebar from '@/components/layout/tenant-sidebar';
import Sidebar from '@/components/layout/sidebar';

export default async function SettingsLayout({
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
      <main className="flex-1 p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}


