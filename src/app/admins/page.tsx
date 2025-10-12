import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Página de Administradores (somente admin)
 * Tenant é redirecionado para /dashboard
 */
export default async function AdminsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Administradores são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  // Importa dinamicamente a página do Krov
  const { default: KrovAdmins } = await import('@/app/krov/admins/page');
  return <KrovAdmins />;
}

