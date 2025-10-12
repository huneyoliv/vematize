'use server'

import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/auth';

export async function logoutAction() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (sessionToken) {
    // Deleta a sessão do banco de dados
    await deleteSession(sessionToken);
  }

  // Remove o cookie
  cookieStore.delete('session_token');

  return { success: true };
}





