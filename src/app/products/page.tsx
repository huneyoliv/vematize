import { getProducts } from "./actions";
import { ProductsManager } from "./components/products-manager";
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { redirect } from 'next/navigation';

export default async function ProductsPage() {
    // Protege a rota - requer autenticação (tenant identificado pela sessão)
    try {
        await getTenantFromSession();
    } catch (error) {
        redirect('/login');
    }

    const products = await getProducts();

    return (
        <>
            <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
                </div>
                <ProductsManager initialProducts={products} />
            </div>
        </>
    );
}
