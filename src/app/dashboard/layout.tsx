import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

/**
 * Layout Unificado para Dashboard
 * 
 * ✅ DETECTA O ROLE automaticamente e passa para a Sidebar
 * - Admin → Mostra items admin (Clientes, Cupons, Relatórios, etc.)
 * - Tenant → Mostra items tenant (Produtos, Bots, Plano, etc.)
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // ✅ Determina o tipo de usuário para passar para a Sidebar
  const userType = session.type === 'admin' ? 'admin' : 'tenant';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userType={userType} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
