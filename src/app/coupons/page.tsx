import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Página de Cupons (somente admin)
 * Tenant é redirecionado para /dashboard
 */
export default async function CouponsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Cupons são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  // Importa dinamicamente a página do Krov
  const { default: KrovCoupons } = await import('@/app/krov/coupons/page');
  return <KrovCoupons />;
}

