import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';

/**
 * Layout para páginas de autenticação (/login, /register)
 * 
 * 🔒 PROTEÇÃO:
 * - Se o usuário JÁ estiver autenticado, redireciona para o dashboard apropriado
 * - Admin → /dashboard
 * - Tenant → /dashboard
 * 
 * Isso previne que usuários autenticados acessem páginas de login/registro
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  // Se já estiver autenticado, redireciona para dashboard ou setup
  if (session) {
    if (session.subscriptionStatus === 'pending_setup') {
      redirect('/setup-account');
    }
    // Ambos vão para /dashboard agora (conteúdo dinâmico baseado no role)
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}
