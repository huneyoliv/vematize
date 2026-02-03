import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCoupons } from "./actions";
import { CouponsManager } from "./components/coupons-manager";
import { Separator } from "@/components/ui/separator";

/**
 * Página de Cupons (Admin Only)
 * 
 * 🔒 PROTEÇÃO:
 * - Requer autenticação
 * - Apenas admins podem acessar
 * - Tenants são redirecionados para /dashboard
 */
export default async function CouponsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Cupons são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  const coupons = await getCoupons();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os cupons de desconto para os planos SaaS.
        </p>
      </div>
      <Separator />
      <CouponsManager initialCoupons={coupons} />
    </div>
  );
}

