import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';

/**
 * Página de Dashboard Unificada
 * 
 * Redireciona automaticamente para o dashboard correto
 */
export default async function DashboardRedirect() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  if (session.type === 'admin') {
    redirect('/krov/dashboard');
  } else if (session.type === 'tenant' && session.subdomain) {
    redirect(`/${session.subdomain}/dashboard`);
  }

  // Fallback
  redirect('/login');
}
