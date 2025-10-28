/**
 * Layout Adaptativo Universal
 * 
 * Este layout detecta automaticamente o tipo de usuário (admin/tenant)
 * e renderiza a interface apropriada:
 * 
 * - Admin: Sidebar do Krov + Features administrativas
 * - Tenant: Sidebar do Cliente + Features do cliente
 */

import { ReactNode } from 'react';
import Sidebar from './sidebar';
import ClientSidebar from './client-sidebar';
import { UserNav } from './user-nav';
import { Toaster } from '@/components/ui/toaster';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface AdaptiveDashboardLayoutProps {
  children: ReactNode;
  /** Componentes adicionais específicos para o tipo de usuário */
  tenantExtras?: ReactNode;
  adminExtras?: ReactNode;
}

export async function AdaptiveDashboardLayout({ 
  children, 
  tenantExtras,
  adminExtras 
}: AdaptiveDashboardLayoutProps) {
  // Obtém sessão do usuário
  const session = await getCurrentSession();

  // Se não autenticado, redireciona para login
  if (!session) {
    redirect('/login');
  }

  // Determina qual sidebar e features mostrar
  const isAdmin = session.type === 'admin';
  const SidebarComponent = isAdmin ? Sidebar : ClientSidebar;
  const userType = isAdmin ? 'admin' : 'client';

  return (
    <div className="flex min-h-screen bg-secondary/10">
      {/* Sidebar adaptativa */}
      <SidebarComponent />
      
      <main className="flex-1 flex-col overflow-y-auto pt-16 lg:pt-0">
        {/* User navigation no canto superior direito */}
        <div className="absolute top-4 right-4 z-20">
          <UserNav userType={userType} />
        </div>

        {/* Conteúdo principal */}
        {children}

        {/* Componentes extras específicos do tipo de usuário */}
        {isAdmin ? adminExtras : tenantExtras}

        {/* Toast notifications */}
        <Toaster />
      </main>
    </div>
  );
}

