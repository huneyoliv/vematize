import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

/**
 * Layout para Clientes (Admin Only)
 * 
 * Usa sidebar admin
 */
export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Clientes são admin only
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





