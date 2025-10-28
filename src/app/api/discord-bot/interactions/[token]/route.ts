import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import clientPromise from '@/lib/mongodb';
import { validateInteractionsToken } from '@/lib/discord/interactions-token';
import type { Tenant } from '@/lib/types';
import { ObjectId } from 'mongodb';

// ===== CACHE DE PUBLIC KEYS (evita query no DB a cada PING) =====
const publicKeyCache = new Map<string, { publicKey: string; tenantId: string; cachedAt: number }>();
const CACHE_TTL = 60000; // 1 minuto

function getCachedPublicKey(token: string): { publicKey: string; tenantId: string } | null {
    const cached = publicKeyCache.get(token);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        return { publicKey: cached.publicKey, tenantId: cached.tenantId };
    }
    return null;
}

function setCachedPublicKey(token: string, publicKey: string, tenantId: string): void {
    publicKeyCache.set(token, { publicKey, tenantId, cachedAt: Date.now() });
}

// ===== RATE LIMITING =====
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requisições por minuto
const RATE_WINDOW = 60000; // 1 minuto

function checkRateLimit(token: string): boolean {
    const now = Date.now();
    const limit = rateLimitMap.get(token);

    if (!limit || now > limit.resetAt) {
        rateLimitMap.set(token, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (limit.count >= RATE_LIMIT) {
        return false;
    }

    limit.count++;
    return true;
}

// ===== HEALTH CHECK =====
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    return NextResponse.json({
        status: 'ok',
        service: 'discord-interactions',
        token: params.token.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
    });
}

// ===== MAIN ENDPOINT =====
export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const startTime = Date.now();
    
    try {
        const { token } = params;

        // ===== 1. RATE LIMITING =====
        if (!checkRateLimit(token)) {
            console.warn('[Discord] Rate limit exceeded for token:', token.substring(0, 8));
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 2. LÊ RAW BODY (CRÍTICO PARA VERIFICAÇÃO) =====
        const rawBody = await request.text();
        
        if (!rawBody) {
            console.error('[Discord] Empty body');
            return new Response(
                JSON.stringify({ error: 'Empty body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 3. VALIDA HEADERS DE SEGURANÇA =====
        const signature = request.headers.get('x-signature-ed25519');
        const timestamp = request.headers.get('x-signature-timestamp');

        if (!signature || !timestamp) {
            console.error('[Discord] ❌ Missing security headers');
            return new Response(
                JSON.stringify({ error: 'Missing security headers' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 4. BUSCA PUBLIC KEY (com cache) =====
        let publicKey: string;
        let tenantId: string;

        const cached = getCachedPublicKey(token);
        if (cached) {
            publicKey = cached.publicKey;
            tenantId = cached.tenantId;
        } else {
            // Valida token no banco e busca tenant
            const tenant = await validateInteractionsToken(token);
            
            if (!tenant) {
                console.error('[Discord] ❌ Invalid token');
                return new Response(
                    JSON.stringify({ error: 'Invalid token' }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                );
            }

            tenantId = tenant._id.toString();

            const discordConnection = tenant.connections?.discord;
            
            // Adicionar logs antes da verificação de publicKey
            console.log('[Discord Debug] Tenant loaded:', {
                tenantId: tenantId,
                hasConnections: !!tenant.connections,
                hasDiscord: !!tenant.connections?.discord,
                hasPublicKey: !!tenant.connections?.discord?.publicKey,
                publicKeyPreview: tenant.connections?.discord?.publicKey?.substring(0, 8) + '...'
            });

            // O if existente
            if (!discordConnection?.publicKey) {
                console.error(`[Discord] ❌ No public key configured for tenant: ${tenantId}`);
                return new Response(
                    JSON.stringify({ error: 'Bot not configured' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            publicKey = discordConnection.publicKey;
            
            // Salva no cache
            setCachedPublicKey(token, publicKey, tenantId);
        }

        // ===== 5. VALIDA ASSINATURA (OBRIGATÓRIO) =====
        const isValid = verifyKey(rawBody, signature, timestamp, publicKey);

        if (!isValid) {
            console.error('[Discord] ❌ Invalid signature');
            console.error('[Discord] Headers:', { signature: signature.substring(0, 16) + '...', timestamp });
            console.error('[Discord] Body length:', rawBody.length);
            console.error('[Discord] Public key:', publicKey.substring(0, 16) + '...');
            
            return new Response(
                JSON.stringify({ error: 'Invalid request signature' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 6. PARSE DO BODY (só depois da validação) =====
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch (parseError) {
            console.error('[Discord] ❌ Invalid JSON:', parseError);
            return new Response(
                JSON.stringify({ error: 'Invalid JSON' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 7. RESPONDE AO PING (type: 1) =====
        if (body.type === 1) {
            const responseTime = Date.now() - startTime;
            console.log(`[Discord] ✅ PING validated and responded in ${responseTime}ms`);
            
            return new Response(
                '{"type":1}',
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    }
                }
            );
        }

        // ===== 8. PROCESSA SELECT MENU (type: 3, component_type: 3) =====
        if (body.type === 3 && body.data?.component_type === 3) {
            console.log('[Discord] Processing Select Menu interaction');
            
            // Busca tenant completo para processar
            const client = await clientPromise;
            const db = client.db('vematize');
            const tenant = await db.collection<Tenant>('tenants').findOne({
                _id: new ObjectId(tenantId)
            });

            if (!tenant) {
                return new Response(
                    JSON.stringify({
                        type: 4,
                        data: {
                            content: '❌ Configuração não encontrada.',
                            flags: 64 // Ephemeral
                        }
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }

            // Responde imediatamente que está processando
            return new Response(
                JSON.stringify({
                    type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 9. PROCESSA BOTÕES (type: 3, component_type: 2) =====
        if (body.type === 3 && body.data?.component_type === 2) {
            console.log('[Discord] Processing Button interaction');
            
            return new Response(
                JSON.stringify({
                    type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 10. COMANDOS SLASH (type: 2) =====
        if (body.type === 2) {
            console.log('[Discord] Processing Slash Command:', body.data?.name);
            
            return new Response(
                JSON.stringify({
                    type: 4,
                    data: {
                        content: '✅ Comando recebido via HTTP!',
                        flags: 64
                    }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ===== 11. TIPO DESCONHECIDO =====
        console.warn('[Discord] Unknown interaction type:', body.type);
        return new Response(
            JSON.stringify({
                type: 4,
                data: {
                    content: '❌ Tipo de interação não suportado.',
                    flags: 64
                }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Discord] ❌ Critical error:', error);
        
        // Tenta responder com erro
        return new Response(
            JSON.stringify({
                type: 4,
                data: {
                    content: '❌ Erro ao processar interação.',
                    flags: 64
                }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
