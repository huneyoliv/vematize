'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { logoutAdminAction } from './actions';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleLogout() {
      // Remove a sessão do servidor
      await logoutAdminAction();
      
      // Limpa sessionStorage
      sessionStorage.removeItem('forcePasswordChange');
      
      // Redireciona para login
      router.push('/krov/login'); 
    }

    handleLogout();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Saindo...</p>
    </div>
  );
}
