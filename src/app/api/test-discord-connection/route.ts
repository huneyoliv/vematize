
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { botToken } = body;

        if (!botToken) {
            return NextResponse.json(
                { success: false, message: 'Token do bot não fornecido.' },
                { status: 400 }
            );
        }

        // Validate token with Discord API
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
                success: true,
                message: `Conectado como ${data.username}`,
                data: {
                    id: data.id,
                    username: data.username,
                    discriminator: data.discriminator,
                },
            });
        } else {
            // Tentar ler o erro, mas cuidado com JSON inválido no erro
            const errorData = await response.json().catch(() => ({}));
            console.error('[Discord Connection Test] Discord API Error:', response.status, errorData);

            if (response.status === 401) {
                return NextResponse.json(
                    { success: false, message: 'Token inválido. Verifique suas credenciais.' },
                    { status: 200 } // Retornando 200 com success: false para o frontend lidar gracefully (conforme esperado pelo config-form)
                );
            }

            return NextResponse.json(
                { success: false, message: 'Não foi possível conectar ao Discord. Verifique o token.' },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error('[Discord Connection Test] Internal Error:', error);
        return NextResponse.json(
            { success: false, message: 'Erro interno ao testar conexão.' },
            { status: 500 }
        );
    }
}
