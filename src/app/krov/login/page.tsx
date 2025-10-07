import { redirect } from 'next/navigation';

/**
 * Redireciona para o login unificado
 * O sistema agora usa /login para tanto admin quanto tenant
 */
export default function KrovLoginRedirect() {
  redirect('/login');
}
