import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Página de Relatórios (somente admin)
 * Tenant é redirecionado para /dashboard
 */
export default async function ReportsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Relatórios são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  // Importa dinamicamente a página do Krov
  const { default: KrovReports } = await import('@/app/krov/reports/page');
  return <KrovReports />;
}

