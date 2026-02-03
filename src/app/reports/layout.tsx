import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

/**
 * Layout para /reports - Apenas Admin
 * 
 * Usa o layout unificado do dashboard com sidebar dinâmica
 */
export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Relatórios são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userType="admin" />
      <main className="flex-1 p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}





