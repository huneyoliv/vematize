import { getBotConnections } from "./actions";
import { BotConfigCards } from "./components/bot-config-cards";
import { requireTenantAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function MyBotsPage({ params }: { params: { subdomain: string } }) {
    // Protege a rota - requer autenticação e acesso ao subdomain
    try {
        await requireTenantAccess(params.subdomain);
    } catch (error) {
        redirect('/login');
    }

    const connections = await getBotConnections(params.subdomain);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Meus Bots</h2>
            </div>
            <BotConfigCards initialConnections={connections} />
        </div>
    );
}
