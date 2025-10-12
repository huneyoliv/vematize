import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Página de Clientes (somente admin)
 * Tenant é redirecionado para /dashboard
 */
export default async function ClientsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Clientes são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  // Importa dinamicamente a página do Krov
  const { default: KrovClients } = await import('@/app/krov/clients/page');
  return <KrovClients />;
}

