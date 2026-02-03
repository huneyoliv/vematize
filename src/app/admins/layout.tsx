import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

/**
 * Layout para /admins - Apenas Admin
 * 
 * Usa o layout unificado do dashboard com sidebar dinâmica
 */
export default async function AdminsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Administradores são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userType="admin" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}





