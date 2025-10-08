import { AdaptiveDashboardLayout } from '@/components/layout/adaptive-dashboard-layout';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Layout Unificado de Dashboard
 * 
 * Redireciona para o dashboard apropriado baseado no tipo de usuário:
 * - Admin → /krov/dashboard
 * - Tenant → /{subdomain}/dashboard
 */
export default async function UnifiedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Redireciona para o dashboard específico
  if (session.type === 'admin') {
    redirect('/krov/dashboard');
  } else if (session.type === 'tenant' && session.subdomain) {
    redirect(`/${session.subdomain}/dashboard`);
  }

  // Fallback (não deveria chegar aqui)
  return <>{children}</>;
}
