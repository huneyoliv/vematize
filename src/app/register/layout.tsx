import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';

/**
 * Layout para página de registro
 * 
 * 🔒 PROTEÇÃO:
 * - Se o usuário JÁ estiver autenticado, redireciona para /dashboard
 * 
 * Isso previne que usuários autenticados acessem a página de registro
 */
export default async function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  // Se já estiver autenticado, redireciona para dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}
