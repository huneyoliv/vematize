import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getCurrentSession();
        if (!session?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { botToken, guildId } = await request.json();

        if (!botToken || !guildId) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        // Importação dinâmica do discord.js
        const { Client, GatewayIntentBits, ChannelType } = await import('discord.js');

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

        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            await client.destroy();
            return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
        }

        // Buscar canais de texto
        const textChannels = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText)
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                parentId: channel.parentId,
            }));

        // Buscar categorias
        const categories = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildCategory)
            .map(category => ({
                id: category.id,
                name: category.name,
            }));

        // Buscar cargos (excluindo @everyone)
        const roles = guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
            }))
            .sort((a, b) => b.position - a.position); // Ordenar por posição (mais altos primeiro)

        await client.destroy();

        return NextResponse.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
            },
            channels: textChannels,
            categories,
            roles,
        });

    } catch (error: any) {
        console.error('[Discord Guild Data] Erro:', error);
        return NextResponse.json({ 
            error: 'Erro ao buscar dados do servidor.' 
        }, { status: 500 });
    }
}


