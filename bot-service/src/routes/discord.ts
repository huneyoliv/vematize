/**
 * Discord Interactions HTTP Route
 * Endpoint para receber interactions do Discord via HTTP (não WebSocket/Gateway)
 */

import { Router, Request, Response } from 'express';
import { verifyKey } from 'discord-interactions';
import { asyncHandler } from '../middleware/error-handler';
import { webhookLimiter } from '../middleware/rate-limiter';
import { logPublicRequest } from '../middleware/auth';
import { validateInteractionsToken } from '../services/discord/interactions-token';
import { hasValidSubscription, getExpiredSubscriptionMessage } from '../utils/subscription';
import { runExpirationChecks } from '../utils/expiration-checks';
import logger from '../utils/logger';
import { Tenant } from '../types';

const router = Router();

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
    publicKeyCache.set(token, {
        publicKey,
        tenantId,
        cachedAt: Date.now()
    });
}

/**
 * GET /api/v1/discord/interactions/:token
 * Health check endpoint
 */
router.get('/interactions/:token', asyncHandler(async (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'discord-interactions',
        message: 'Discord HTTP Interactions endpoint is active',
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /api/v1/discord/interactions/:token
 * Endpoint de validação do Discord (PING)
 * Migrado do Next.js para o bot-service
 */
router.post('/interactions/:token', webhookLimiter, logPublicRequest, asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { token } = req.params;
    const requestId = Math.random().toString(36).substring(2, 15);

    // ===== LOGS DE DEBUG: INÍCIO DA REQUISIÇÃO =====
    logger.info(`[Discord:${requestId}] ===== INCOMING REQUEST START =====`);
    logger.info(`[Discord:${requestId}] Method: ${req.method}`);
    logger.info(`[Discord:${requestId}] URL: ${req.url}`);
    logger.info(`[Discord:${requestId}] Token: ${token.substring(0, 8)}...`);
    logger.info(`[Discord:${requestId}] IP: ${req.ip}`);
    logger.info(`[Discord:${requestId}] User-Agent: ${req.headers['user-agent']}`);

    // Headers importantes
    logger.info(`[Discord:${requestId}] Headers:`, {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'x-signature-ed25519': req.headers['x-signature-ed25519'] ? 'PRESENT' : 'MISSING',
        'x-signature-timestamp': req.headers['x-signature-timestamp'] || 'MISSING',
        'host': req.headers['host'],
        'cf-ray': req.headers['cf-ray'],
        'cf-connecting-ip': req.headers['cf-connecting-ip']
    });

    try {
        // ===== 1. RATE LIMITING =====
        logger.info(`[Discord:${requestId}] Rate limiting: PASSED (webhookLimiter applied)`);

        // ===== 2. LÊ RAW BODY (CRÍTICO PARA VERIFICAÇÃO) =====
        const rawBody = (req as any).rawBody;
        const parsedBody = req.body;

        logger.info(`[Discord:${requestId}] ===== BODY ANALYSIS =====`);
        logger.info(`[Discord:${requestId}] Raw body length: ${rawBody ? rawBody.length : 0}`);
        logger.info(`[Discord:${requestId}] Raw body (first 500 chars): ${rawBody ? rawBody.substring(0, 500) : 'EMPTY'}`);
        logger.info(`[Discord:${requestId}] Parsed body:`, parsedBody || 'EMPTY');

        // ===== 3. VALIDA HEADERS DE SEGURANÇA =====
        const signature = req.headers['x-signature-ed25519'] as string;
        const timestamp = req.headers['x-signature-timestamp'] as string;

        logger.info(`[Discord:${requestId}] ===== SECURITY HEADERS =====`);
        logger.info(`[Discord:${requestId}] Signature: ${signature ? signature.substring(0, 16) + '...' : 'NULL'}`);
        logger.info(`[Discord:${requestId}] Timestamp: ${timestamp || 'NULL'}`);

        // ===== 4. BUSCA PUBLIC KEY (com cache) =====
        logger.info(`[Discord:${requestId}] ===== PUBLIC KEY LOOKUP =====`);

        let publicKey: string;
        let tenantId: string;
        let cacheHit = false;

        const cached = getCachedPublicKey(token);
        if (cached) {
            publicKey = cached.publicKey;
            tenantId = cached.tenantId;
            cacheHit = true;
            logger.info(`[Discord:${requestId}] Cache HIT - Public key found for tenant: ${tenantId}`);
        } else {
            logger.info(`[Discord:${requestId}] Cache MISS - Querying database...`);

            // Valida token no banco e busca tenant
            const tenant = await validateInteractionsToken(token);

            if (!tenant) {
                logger.error(`[Discord:${requestId}] ❌ Invalid token - No tenant found`);
                const response = { error: 'Invalid token' };
                logger.info(`[Discord:${requestId}] Response (401):`, response);
                return res.status(401).json(response);
            }

            tenantId = tenant._id.toString();
            const discordConnection = tenant.connections?.discord;

            logger.info(`[Discord:${requestId}] Tenant found: ${tenantId}`);
            logger.info(`[Discord:${requestId}] Discord connection exists: ${!!discordConnection}`);
            logger.info(`[Discord:${requestId}] Public key configured: ${!!discordConnection?.publicKey}`);

            if (!discordConnection?.publicKey) {
                logger.error(`[Discord:${requestId}] ❌ No public key configured for tenant: ${tenantId}`);
                const response = { error: 'Bot not configured' };
                logger.info(`[Discord:${requestId}] Response (400):`, response);
                return res.status(400).json(response);
            }

            publicKey = discordConnection.publicKey;
            logger.info(`[Discord:${requestId}] Public key loaded from database`);

            // Salva no cache
            setCachedPublicKey(token, publicKey, tenantId);
            logger.info(`[Discord:${requestId}] Public key saved to cache`);
        }

        logger.info(`[Discord:${requestId}] Cache status: ${cacheHit ? 'HIT' : 'MISS'}`);
        logger.info(`[Discord:${requestId}] Public key preview: ${publicKey.substring(0, 16)}...`);

        // ===== 5. VALIDAÇÃO DE SEGURANÇA =====
        logger.info(`[Discord:${requestId}] ===== SECURITY VALIDATION =====`);

        // Se não tem signature/timestamp, pode ser uma requisição de validação do Discord
        if (!signature || !timestamp) {
            logger.warn(`[Discord:${requestId}] ⚠️ Missing security headers - checking for validation PING`);

            // Tenta parsear o body mesmo sem assinatura (para validação inicial)
            if (parsedBody && parsedBody.type === 1) {
                logger.info(`[Discord:${requestId}] ✅ Validation PING detected (type: 1)`);
                const response = { type: 1 };
                logger.info(`[Discord:${requestId}] Response (200):`, response);
                logger.info(`[Discord:${requestId}] Processing time: ${Date.now() - startTime}ms`);
                logger.info(`[Discord:${requestId}] ===== REQUEST END =====\n`);
                return res.json(response);
            }

            logger.error(`[Discord:${requestId}] ❌ Missing security headers and no valid PING`);
            const response = { error: 'Missing security headers' };
            logger.info(`[Discord:${requestId}] Response (401):`, response);
            return res.status(401).json(response);
        }

        // ===== 6. VALIDA ASSINATURA (OBRIGATÓRIO PARA REQUISIÇÕES REAIS) =====
        logger.info(`[Discord:${requestId}] ===== SIGNATURE VALIDATION =====`);

        if (!rawBody) {
            logger.error(`[Discord:${requestId}] ❌ Empty raw body`);
            const response = { error: 'Empty body' };
            logger.info(`[Discord:${requestId}] Response (400):`, response);
            return res.status(400).json(response);
        }

        logger.info(`[Discord:${requestId}] Validating signature...`);
        logger.info(`[Discord:${requestId}] Body length for signature: ${rawBody.length}`);
        logger.info(`[Discord:${requestId}] Timestamp for signature: ${timestamp}`);

        // Usa o rawBody (string) para validação de assinatura
        let isValid = false;
        try {
            isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
        } catch (err) {
            logger.error(`[Discord:${requestId}] ❌ Error verifying key:`, err);
            isValid = false;
        }

        logger.info(`[Discord:${requestId}] Signature validation result: ${isValid ? 'VALID' : 'INVALID'}`);

        if (!isValid) {
            logger.error(`[Discord:${requestId}] ❌ Invalid signature`);
            const response = { error: 'Invalid request signature' };
            logger.info(`[Discord:${requestId}] Response (401):`, response);
            return res.status(401).json(response);
        }

        logger.info(`[Discord:${requestId}] ✅ Signature validated successfully`);

        // ===== 7. PROCESSA INTERACTION TYPE =====
        logger.info(`[Discord:${requestId}] ===== INTERACTION PROCESSING =====`);
        logger.info(`[Discord:${requestId}] Interaction type: ${parsedBody?.type}`);

        // ===== 7. RESPONDE AO PING (type: 1) =====
        if (parsedBody?.type === 1) {
            const responseTime = Date.now() - startTime;
            logger.info(`[Discord:${requestId}] ✅ PING interaction processed successfully`);
            logger.info(`[Discord:${requestId}] Response time: ${responseTime}ms`);

            const response = { type: 1 };
            logger.info(`[Discord:${requestId}] Response body:`, JSON.stringify(response));
            logger.info(`[Discord:${requestId}] Response Content-Type: application/json`);
            logger.info(`[Discord:${requestId}] Response Status: 200`);

            // Log final antes de enviar
            logger.info(`[Discord:${requestId}] ===== SENDING RESPONSE =====`);
            logger.info(`[Discord:${requestId}] Raw response: ${JSON.stringify(response)}`);
            logger.info(`[Discord:${requestId}] ===== REQUEST END =====\n`);

            // Resposta MANUAL e SIMPLES para garantir que nada do Express atrapalhe
            res.setHeader('Content-Type', 'application/json');
            const responseBody = '{"type":1}';

            logger.info(`[Discord:${requestId}] Sending raw response: ${responseBody}`);
            logger.info(`[Discord:${requestId}] Response Headers: ${JSON.stringify(res.getHeaders())}`);

            return res.status(200).send(responseBody);
        }

        // ===== 8. HANDLE INTERACTION TYPES =====
        const interactionType = parsedBody.type;

        switch (interactionType) {
            case 3: // MESSAGE_COMPONENT (Botões, Select Menus)
                const customId = parsedBody.data?.custom_id;
                logger.info(`[Discord:${requestId}] 🔘 Handling Component Interaction: ${customId}`);

                if (customId?.startsWith('PANEL_SELECT:')) {
                    const selectedValue = parsedBody.data?.values?.[0];
                    if (!selectedValue) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Nenhuma opção selecionada.', flags: 64 } });
                    }

                    // 1. Buscar Produto
                    const { productService } = await import('../services/product.service');
                    const product = await productService.getProductById(selectedValue);

                    if (!product) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Este produto não está mais disponível.', flags: 64 } });
                    }

                    // 2. Buscar Tenant e Bot Token (NOVO)
                    const { tenantService } = await import('../services/tenant.service');
                    const tenant = await tenantService.getTenantById(product.tenantId);
                    const botToken = tenant?.connections?.discord?.botToken;

                    // 3. Criar Canal Privado (NOVO)
                    let privateChannelId: string | undefined;
                    const guildId = parsedBody.guild_id;
                    const userId = parsedBody.member?.user?.id || parsedBody.user?.id;
                    const username = parsedBody.member?.user?.username || parsedBody.user?.username;

                    logger.info(`[Discord:${requestId}] Attempting to create private channel...`);
                    logger.info(`[Discord:${requestId}] Guild: ${guildId}, User: ${userId}, BotToken: ${botToken ? 'PRESENT' : 'MISSING'}`);

                    if (botToken && guildId && userId) {
                        const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                        const { channelService } = await import('../services/discord/channel.service');

                        // Usar o ID do canal onde a interação ocorreu (parsedBody.channel_id)
                        const parentChannelId = parsedBody.channel_id;

                        const thread = await channelService.createPrivateThread(
                            parentChannelId,
                            botToken,
                            `cart-${sanitizedUsername}`
                        );

                        if (thread) {
                            privateChannelId = thread.id;
                            logger.info(`[Discord:${requestId}] Private thread created: ${privateChannelId}`);

                            // Adicionar o usuário à thread
                            await channelService.addMemberToThread(thread.id, botToken, userId);
                        } else {
                            logger.error(`[Discord:${requestId}] Failed to create private thread`);
                        }
                    } else {
                        logger.warn(`[Discord:${requestId}] Missing required data for thread creation`);
                    }

                    // 3.1. Reservar Estoque (NOVO)
                    if (product.stock !== null && product.stock !== undefined) {
                        const reserved = await productService.reserveStock(product._id.toString(), 1);
                        if (!reserved) {
                            return res.status(200).json({
                                type: 4,
                                data: {
                                    content: `❌ Estoque insuficiente para **${product.name}**.`,
                                    flags: 64
                                }
                            });
                        }
                    }

                    // 4. Criar Carrinho
                    const { cartService } = await import('../services/cart.service');
                    const cartId = await cartService.createCart({
                        userId: userId,
                        tenantId: product.tenantId,
                        status: 'active',
                        items: [{
                            productId: product._id.toString(),
                            name: product.name,
                            price: product.price,
                            quantity: 1
                        }],
                        metadata: {
                            panelId: customId.split(':')[1],
                            discordChannelId: parsedBody.channel_id,
                            privateChannelId: privateChannelId // Salva ID do canal privado
                        }
                    });

                    if (!cartId) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Erro ao criar carrinho.', flags: 64 } });
                    }

                    // Payload do Carrinho
                    const cartEmbedPayload = {
                        content: `<@${userId}>`,
                        embeds: [{
                            title: product.name,
                            description: product.description || 'Sem descrição',
                            color: 0x00FF00,
                            fields: [
                                { name: 'Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                                { name: 'Quantidade', value: '1', inline: true }
                            ],
                            footer: { text: `Cart ID: ${cartId}` }
                        }],
                        components: [{
                            type: 1, // ACTION_ROW
                            components: [
                                {
                                    type: 2, // BUTTON
                                    style: 1, // PRIMARY
                                    label: 'Ir para Pagamento',
                                    custom_id: `CHECKOUT:${cartId}`
                                },
                                {
                                    type: 2, // BUTTON
                                    style: 2, // SECONDARY
                                    label: 'Editar Quantidade',
                                    custom_id: `CART_QUANTITY:${cartId}`,
                                    emoji: { name: '✏️' }
                                },
                                {
                                    type: 2, // BUTTON
                                    style: 2, // SECONDARY
                                    label: 'Usar Cupom',
                                    custom_id: `CART_COUPON:${cartId}`,
                                    emoji: { name: '🎟️' }
                                },
                                {
                                    type: 2, // BUTTON
                                    style: 4, // DANGER
                                    label: 'Cancelar',
                                    custom_id: `CART_CANCEL:${cartId}`,
                                    emoji: { name: '🗑️' }
                                }
                            ]
                        }]
                    };

                    // 5. Enviar Mensagem no Canal Privado (se criado com sucesso)
                    if (privateChannelId && botToken) {
                        const { channelService } = await import('../services/discord/channel.service');
                        await channelService.sendMessage(privateChannelId, botToken, cartEmbedPayload);

                        // Responder Ephemeral com Link
                        return res.status(200).json({
                            type: 4,
                            data: {
                                content: `✅ **Carrinho criado com sucesso!**\n\nAcesse seu carrinho aqui: <#${privateChannelId}>`,
                                flags: 64
                            }
                        });
                    }

                    // Fallback: Se não conseguiu criar canal, responde ephemeral com o embed (comportamento antigo)
                    return res.status(200).json({
                        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                        data: {
                            content: `🛒 **Resumo do Pedido**`,
                            embeds: cartEmbedPayload.embeds,
                            components: cartEmbedPayload.components,
                            flags: 64 // EPHEMERAL
                        }
                    });
                }

                if (customId?.startsWith('CHECKOUT:')) {
                    // 1. Responder imediatamente com DEFERRED (Carregando...)
                    res.status(200).json({ type: 5, flags: 64 }); // 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

                    // Executar lógica em background
                    (async () => {
                        try {
                            const cartId = customId.split(':')[1];

                            // Buscar Carrinho
                            const { cartService } = await import('../services/cart.service');
                            const cart = await cartService.getCart(cartId);
                            if (!cart) return;

                            // Buscar Tenant
                            const { tenantService } = await import('../services/tenant.service');
                            const tenant = await tenantService.getTenantById(cart.tenantId);
                            if (!tenant) return;

                            // Gerar Pagamento
                            const { paymentService } = await import('../services/payment.service');
                            const paymentResult = await paymentService.createPayment(cart, tenant);
                            if (!paymentResult) return;

                            // ------------------------------------------------------------------
                            // [SEARCH FEATURE] Create Sale Record
                            // This is required for the Webhook to find the sale and for the
                            // Tenant Dashboard Search feature to work.
                            // The 'paymentId' from the gateway is the key identifier.
                            // ------------------------------------------------------------------
                            const { saleService } = await import('../services/sale.service');
                            await saleService.createSale({
                                tenantId: cart.tenantId,
                                productId: cart.items[0].productId,
                                userId: cart.userId,
                                discordChannelId: cart.metadata?.discordChannelId,
                                discordThreadId: cart.metadata?.privateChannelId,
                                quantity: cart.items[0].quantity,
                                couponCode: cart.metadata?.couponCode,
                                status: 'pending',
                                paymentGateway: 'mercadopago', // TODO: Dynamic based on settings
                                createdAt: new Date(),
                                paymentDetails: {
                                    paymentId: paymentResult.paymentId,
                                    qrCode: paymentResult.qrCode,
                                    qrCodeBase64: paymentResult.qrCodeBase64,
                                    ticketUrl: paymentResult.ticketUrl
                                }
                            });

                            // Preparar Payload Multipart
                            const formData = new FormData();

                            const payload = {
                                content: `✅ **Pagamento Gerado!**\n\nUse o código abaixo para pagar via Pix (Copia e Cola):`,
                                embeds: [{
                                    title: 'Pagamento Pix',
                                    description: `Valor: **R$ ${cart.items.reduce((a, b) => a + b.price * b.quantity, 0).toFixed(2)}**\n\nExpira em 30 minutos.`,
                                    color: 0x00FF00,
                                    fields: [
                                        {
                                            name: 'Código Pix',
                                            value: `\`\`\`${paymentResult.qrCode}\`\`\``
                                        },
                                        {
                                            name: 'ID da Transação',
                                            value: `\`${paymentResult.paymentId}\``,
                                            inline: true
                                        }
                                    ],
                                    image: {
                                        url: 'attachment://qrcode.png'
                                    },
                                    footer: {
                                        text: 'Vematize Payments'
                                    }
                                }],
                                components: [{
                                    type: 1,
                                    components: [{
                                        type: 2,
                                        style: 5, // LINK
                                        label: 'Abrir no Navegador',
                                        url: paymentResult.ticketUrl
                                    }]
                                }],
                                flags: 64 // EPHEMERAL
                            };

                            formData.append('payload_json', JSON.stringify(payload));

                            if (paymentResult.qrCodeBuffer) {
                                const blob = new Blob([new Uint8Array(paymentResult.qrCodeBuffer)], { type: 'image/png' });
                                formData.append('files[0]', blob, 'qrcode.png');
                            }

                            // Enviar Follow-up via Webhook
                            const appId = parsedBody.application_id;
                            const token = parsedBody.token;

                            await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
                                method: 'PATCH',
                                body: formData
                            });

                        } catch (err) {
                            logger.error('Error processing checkout background task:', err);
                        }
                    })();

                    return;
                }

                if (customId?.startsWith('CART_CANCEL:')) {
                    const cartId = customId.split(':')[1];
                    const { cartService } = await import('../services/cart.service');
                    const cart = await cartService.getCart(cartId);

                    if (cart) {
                        // 1. Release Stock
                        const { productService } = await import('../services/product.service');
                        for (const item of cart.items) {
                            await productService.releaseStock(item.productId, item.quantity);
                        }

                        // 2. Update Status
                        await cartService.updateCartStatus(cartId, 'abandoned');

                        // 3. Delete Thread (if exists)
                        if (cart.metadata?.privateChannelId) {
                            const { tenantService } = await import('../services/tenant.service');
                            const tenant = await tenantService.getTenantById(cart.tenantId);
                            const botToken = tenant?.connections?.discord?.botToken;

                            if (botToken) {
                                const { channelService } = await import('../services/discord/channel.service');
                                await channelService.deleteChannel(cart.metadata.privateChannelId, botToken);

                                // Thread deleted, return silent response
                                return res.status(200).json({ type: 6 });
                            }
                        }
                    }

                    return res.status(200).json({
                        type: 7, // UPDATE_MESSAGE
                        data: {
                            content: '❌ **Compra Cancelada**',
                            components: [],
                            embeds: []
                        }
                    });
                }

                if (customId?.startsWith('CART_QUANTITY:')) {
                    const cartId = customId.split(':')[1];
                    return res.status(200).json({
                        type: 9, // MODAL
                        data: {
                            custom_id: `MODAL_QUANTITY:${cartId}`,
                            title: 'Alterar Quantidade',
                            components: [{
                                type: 1,
                                components: [{
                                    type: 4, // TEXT_INPUT
                                    custom_id: 'quantity_input',
                                    label: 'Nova Quantidade',
                                    style: 1, // SHORT
                                    min_length: 1,
                                    max_length: 3,
                                    placeholder: 'Ex: 2',
                                    required: true
                                }]
                            }]
                        }
                    });
                }

                if (customId?.startsWith('CART_COUPON:')) {
                    const cartId = customId.split(':')[1];
                    return res.status(200).json({
                        type: 9, // MODAL
                        data: {
                            custom_id: `MODAL_COUPON:${cartId}`,
                            title: 'Aplicar Cupom',
                            components: [{
                                type: 1,
                                components: [{
                                    type: 4, // TEXT_INPUT
                                    custom_id: 'coupon_input',
                                    label: 'Código do Cupom',
                                    style: 1, // SHORT
                                    min_length: 1,
                                    max_length: 20,
                                    placeholder: 'Ex: PROMO10',
                                    required: true
                                }]
                            }]
                        }
                    });
                }

                return res.status(200).json({
                    type: 4,
                    data: {
                        content: `✅ Interação recebida! ID: \`${customId}\``,
                        flags: 64
                    }
                });

            case 5: // MODAL_SUBMIT
                const modalId = parsedBody.data?.custom_id;
                logger.info(`[Discord:${requestId}] 📝 Handling Modal Submit: ${modalId}`);

                if (modalId?.startsWith('MODAL_QUANTITY:')) {
                    const cartId = modalId.split(':')[1];
                    const quantityInput = parsedBody.data?.components?.[0]?.components?.[0]?.value;
                    const quantity = parseInt(quantityInput, 10);

                    if (isNaN(quantity) || quantity < 1) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Quantidade inválida.', flags: 64 } });
                    }

                    const { cartService } = await import('../services/cart.service');

                    // 1. Fetch Cart first to get Product ID
                    const currentCart = await cartService.getCart(cartId);
                    if (!currentCart) return res.status(200).json({ type: 4, data: { content: '❌ Carrinho não encontrado.', flags: 64 } });

                    // 2. Fetch Product to check Stock
                    const { productService } = await import('../services/product.service');
                    const product = await productService.getProductById(currentCart.items[0].productId);

                    if (!product) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Este produto não está mais disponível.', flags: 64 } });
                    }

                    // 3. Validate Stock
                    if (product.stock !== null && product.stock !== undefined && quantity > product.stock) {
                        return res.status(200).json({
                            type: 4,
                            data: {
                                content: `❌ Estoque insuficiente. Apenas **${product.stock}** unidades disponíveis.`,
                                flags: 64
                            }
                        });
                    }

                    // 4. Update Quantity
                    await cartService.updateCartItemQuantity(cartId, quantity);

                    // Re-fetch cart to get updated details (or just use local calculation if preferred, but re-fetch is safer)
                    const cart = await cartService.getCart(cartId);
                    if (!cart) return res.status(200).json({ type: 4, data: { content: '❌ Erro ao atualizar carrinho.', flags: 64 } });

                    // Update the message with new quantity/price
                    const item = cart.items[0];
                    const total = item.price * item.quantity;

                    return res.status(200).json({
                        type: 7, // UPDATE_MESSAGE
                        data: {
                            embeds: [{
                                title: item.name,
                                description: 'Quantidade atualizada!',
                                color: 0x00FF00,
                                fields: [
                                    { name: 'Preço Unitário', value: `R$ ${item.price.toFixed(2)}`, inline: true },
                                    { name: 'Quantidade', value: `${item.quantity}`, inline: true },
                                    { name: 'Total', value: `R$ ${total.toFixed(2)}`, inline: true }
                                ],
                                footer: { text: `Cart ID: ${cartId}` }
                            }],
                            components: [{ // Keep buttons
                                type: 1,
                                components: [
                                    { type: 2, style: 1, label: 'Ir para Pagamento', custom_id: `CHECKOUT:${cartId}` },
                                    { type: 2, style: 2, label: 'Editar Quantidade', custom_id: `CART_QUANTITY:${cartId}`, emoji: { name: '✏️' } },
                                    { type: 2, style: 2, label: 'Usar Cupom', custom_id: `CART_COUPON:${cartId}`, emoji: { name: '🎟️' } },
                                    { type: 2, style: 4, label: 'Cancelar', custom_id: `CART_CANCEL:${cartId}`, emoji: { name: '🗑️' } }
                                ]
                            }]
                        }
                    });
                }

                if (modalId?.startsWith('MODAL_COUPON:')) {
                    const cartId = modalId.split(':')[1];
                    const couponCode = parsedBody.data?.components?.[0]?.components?.[0]?.value;

                    if (!couponCode) {
                        return res.status(200).json({ type: 4, data: { content: '❌ Código do cupom inválido.', flags: 64 } });
                    }

                    const { cartService } = await import('../services/cart.service');
                    const cart = await cartService.getCart(cartId);
                    if (!cart) return res.status(200).json({ type: 4, data: { content: '❌ Carrinho não encontrado.', flags: 64 } });

                    const { couponService } = await import('../services/coupon.service');
                    const validation = await couponService.validateCouponForProduct(couponCode, cart.items[0].productId, cart.tenantId);

                    if (!validation.success) {
                        return res.status(200).json({ type: 4, data: { content: `❌ ${validation.message}`, flags: 64 } });
                    }

                    // Apply discount logic (simplified for single item)
                    const item = cart.items[0];
                    let originalTotal = item.price * item.quantity;
                    let discountAmount = 0;

                    if (validation.discount?.type === 'percentage') {
                        discountAmount = (originalTotal * validation.discount.value) / 100;
                    } else if (validation.discount?.type === 'fixed') {
                        discountAmount = validation.discount.value;
                    }

                    // Ensure total doesn't go below zero
                    let finalTotal = Math.max(0, originalTotal - discountAmount);

                    // Increment coupon usage (optional here or at checkout, doing here for now but ideally at checkout)
                    // await couponService.incrementCouponUse(couponCode); 
                    // Better to just show preview here and apply at checkout, but for simplicity let's just show preview.

                    return res.status(200).json({
                        type: 7, // UPDATE_MESSAGE
                        data: {
                            embeds: [{
                                title: item.name,
                                description: `Cupom **${couponCode}** aplicado!`,
                                color: 0x00FF00,
                                fields: [
                                    { name: 'Preço Unitário', value: `R$ ${item.price.toFixed(2)}`, inline: true },
                                    { name: 'Quantidade', value: `${item.quantity}`, inline: true },
                                    { name: 'Subtotal', value: `R$ ${originalTotal.toFixed(2)}`, inline: true },
                                    { name: 'Desconto', value: `- R$ ${discountAmount.toFixed(2)}`, inline: true },
                                    { name: 'Total Final', value: `**R$ ${finalTotal.toFixed(2)}**`, inline: true }
                                ],
                                footer: { text: `Cart ID: ${cartId} | Cupom: ${couponCode}` }
                            }],
                            components: [{ // Keep buttons
                                type: 1,
                                components: [
                                    { type: 2, style: 1, label: 'Ir para Pagamento', custom_id: `CHECKOUT:${cartId}` }, // Note: Checkout needs to know about coupon!
                                    { type: 2, style: 2, label: 'Editar Quantidade', custom_id: `CART_QUANTITY:${cartId}`, emoji: { name: '✏️' } },
                                    { type: 2, style: 2, label: 'Usar Cupom', custom_id: `CART_COUPON:${cartId}`, emoji: { name: '🎟️' } },
                                    { type: 2, style: 4, label: 'Cancelar', custom_id: `CART_CANCEL:${cartId}`, emoji: { name: '🗑️' } }
                                ]
                            }]
                        }
                    });
                }

                return res.status(200).json({ type: 4, data: { content: '✅ Recebido!', flags: 64 } });

            default:
                logger.warn(`[Discord:${requestId}] ⚠️ Unknown interaction type: ${interactionType}`);
                return res.status(400).json({ error: 'Unknown interaction type' });
        }

    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        logger.error(`[Discord:${requestId}] ❌ Critical error:`, {
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`
        });

        const response = {
            type: 4,
            data: {
                content: '❌ Erro ao processar interação.',
                flags: 64
            }
        };
        logger.info(`[Discord:${requestId}] Response (200):`, response);
        logger.info(`[Discord:${requestId}] ===== REQUEST END =====\n`);
        return res.json(response);
    }
}));

/**
 * POST /api/v1/discord/interactions/:token
 * Endpoint principal para receber interactions do Discord
 */
// Handler duplicado removido.


export default router;








