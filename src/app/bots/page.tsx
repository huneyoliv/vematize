import { getBotConnections } from "./actions";
import { BotConfigCards } from "./components/bot-config-cards";
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
import { redirect } from 'next/navigation';

export default async function MyBotsPage() {
    // Protege a rota - requer autenticação (tenant identificado pela sessão)
    try {
        await getTenantFromSession();
    } catch (error) {
        redirect('/login');
    }

    const connections = await getBotConnections();

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Meus Bots</h2>
            </div>
            <BotConfigCards initialConnections={connections} />
        </div>
    );
}
