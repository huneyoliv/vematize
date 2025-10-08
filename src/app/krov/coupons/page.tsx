import { getCoupons } from "./actions";
import { CouponsManager } from "./components/coupons-manager";
import { Separator } from "@/components/ui/separator";

export default async function KrovCouponsPage() {
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





