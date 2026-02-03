import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateAdminForm } from './components/create-admin-form';
import { AdminsList } from './components/admins-list';
import { getAdmins } from './actions';
import { Separator } from '@/components/ui/separator';

/**
 * Página de Administradores - APENAS ADMIN
 * 
 * Permite criar novos administradores
 */
export default async function AdminsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Apenas admin pode gerenciar administradores
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  const admins = await getAdmins();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Novo Administrador</h2>
        </div>
        <CreateAdminForm />
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Administradores</h2>
        </div>
        <AdminsList admins={admins} currentAdminId={session.userId} />
      </div>
    </div>
  );
}
