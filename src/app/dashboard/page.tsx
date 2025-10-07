import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Componentes das dashboards específicas
import AdminDashboard from './components/admin-dashboard';
import TenantDashboard from './components/tenant-dashboard';

/**
 * Dashboard Unificada - Adaptável
 * 
 * Detecta automaticamente o tipo de usuário e renderiza
 * a dashboard apropriada:
 * - Admin → Dashboard Krov com métricas globais
 * - Tenant → Dashboard do cliente com suas métricas
 */
export default async function UnifiedDashboard() {
  // Obtém sessão atual
  const session = await getCurrentSession();

  // Se não autenticado, redireciona para login
  if (!session) {
    redirect('/login');
  }

  // Renderiza dashboard baseado no tipo de usuário
  if (session.type === 'admin') {
    return <AdminDashboard />;
  }

  if (session.type === 'tenant' && session.subdomain) {
    return <TenantDashboard subdomain={session.subdomain} />;
  }

  // Fallback (não deveria chegar aqui)
  redirect('/login');
}
