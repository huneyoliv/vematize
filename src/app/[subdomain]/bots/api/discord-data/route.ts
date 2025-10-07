import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { botToken } = await request.json();

        if (!botToken) {
            return NextResponse.json({ error: 'Token do bot não fornecido' }, { status: 400 });
        }

        // Importação dinâmica do discord.js
        const { Client, GatewayIntentBits } = await import('discord.js');

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
            ],
        });

        // Login no bot
        await client.login(botToken);

        // Aguardar o bot ficar pronto
        await new Promise((resolve) => {
            client.once('ready', resolve);
        });

        console.log('[Discord Data] Bot conectado com sucesso');

        // Buscar todos os servidores
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount,
        }));

        console.log(`[Discord Data] Encontrados ${guilds.length} servidores`);

        // Destruir o cliente
        await client.destroy();

        return NextResponse.json({
            success: true,
            guilds,
        });

    } catch (error: any) {
        console.error('[Discord Data] Erro:', error);
        
        // Erros específicos do Discord
        if (error.code === 'TokenInvalid') {
            return NextResponse.json({ 
                error: 'Token inválido. Verifique se você copiou o token corretamente.' 
            }, { status: 400 });
        }

        return NextResponse.json({ 
            error: 'Erro ao conectar ao Discord. Verifique o token.' 
        }, { status: 500 });
    }
}

