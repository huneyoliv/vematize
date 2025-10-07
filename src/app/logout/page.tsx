'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { logoutAction } from './actions';

export default function ClientLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleLogout() {
      // Remove a sessão do servidor
      await logoutAction();
      
      // Limpa sessionStorage (para compatibilidade com código antigo)
      sessionStorage.removeItem('userInfo');
      
      // Redireciona para login
      router.push('/login');
    }

    handleLogout();
  }, [router]);

  return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Saindo...</p>
    </div>
  );
}
