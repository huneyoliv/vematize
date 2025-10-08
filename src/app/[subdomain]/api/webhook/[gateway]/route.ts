import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Tenant, Product } from '@/lib/types';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { Telegraf } from 'telegraf';
import { Db, ObjectId as MongoObjectId } from 'mongodb';
import { checkRateLimit } from '@/lib/webhook-rate-limiter';
import { 
  logWebhookSecurityAlert, 
  checkAndMarkUntrustedWebhook,
  validatePayloadSize,
  extractRequestInfo 
} from '@/lib/webhook-security';

/**
 * Escapes characters for Telegram's MarkdownV2 parse mode.
 * @param text The text to escape.
 * @returns The escaped text.
 */
function escapeMarkdown(text: string): string {
  if (!text) return '';
  // List of characters to escape in MarkdownV2
  const charsToEscape = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  return charsToEscape.reduce((acc, char) => acc.replace(new RegExp('\\' + char, 'g'), '\\' + char), text);
}

/**
 * Validates the Mercado Pago webhook signature.
 * It uses the timestamp from the x-signature header itself.
 */
function isValidSignature(
    signature: string,
    secret: string,
    requestId: string,
    searchParams: URLSearchParams
): boolean {
    if (!signature) {
        console.error('[MP Signature] x-signature header is missing.');
        return false;
    }

    const [tsPart, hash] = signature.split(',v1=');
    if (!tsPart || !hash) {
        console.error('[MP Signature] Signature format is invalid.');
        return false;
    }

    const timestamp = tsPart.split('ts=')[1];
    if (!timestamp) {
        console.error('[MP Signature] Timestamp not found in signature header.');
        return false;
    }

    const dataId = searchParams.get('data.id');
    if (!dataId) {
        console.error('[MP Signature] data.id not found in query params.');
        return false;
    }

    // Template from Mercado Pago documentation:
    // id:<data.id>;request-id:<x-request-id>;ts:<ts>;
    const baseString = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(baseString);
    const computedHash = hmac.digest('hex');

    const signatureMatches = computedHash === hash;
    if (!signatureMatches) {
        console.error(`[MP Signature] Signature mismatch.`, {
            baseString,
            computedHash,
            receivedHash: hash
        });
    }

    return signatureMatches;
}

/**
 * Handles webhook notifications from various payment gateways.
 * This endpoint is tenant-specific and gateway-specific.
 * 
 * Example URL to configure in a payment gateway:
 * https://<your-app-url>/<tenant-subdomain>/api/webhook/<gateway-name>
 * e.g., https://meusite.com/loja-a/api/webhook/mercadopago
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string, gateway: string } }
) {
  const { subdomain, gateway } = params;
  
  if (!subdomain || !gateway) {
    return NextResponse.json({ success: false, message: 'Subdomain or gateway is missing.' }, { status: 400 });
  }

  // ==========================================
  // PROTEÇÃO 1: VALIDAÇÃO DE TAMANHO (1MB)
  // ==========================================
  const contentLength = request.headers.get('content-length');
  if (!validatePayloadSize(contentLength, 1048576)) {
    console.error(`[Webhook Security] Payload too large for ${subdomain}/${gateway}. Size: ${contentLength}`);
    return NextResponse.json({ success: false, message: 'Payload too large. Maximum 1MB.' }, { status: 413 });
  }

  // ==========================================
  // PROTEÇÃO 2: RATE LIMITING ESTRITO
  // ==========================================
  const rateLimitKey = `webhook:${subdomain}:${gateway}`;
  const rateLimit = checkRateLimit(rateLimitKey, {
    requestsPerSecond: 1,
    burstLimit: 3,
    windowMs: 1000,
  });

  if (!rateLimit.allowed) {
    const requestInfo = extractRequestInfo(request);
    console.warn(`[Webhook Security] Rate limit exceeded for ${subdomain}/${gateway}`, {
      ip: requestInfo.ip,
      retryAfter: rateLimit.retryAfter,
    });
    
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter?.toString() || '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        }
      }
    );
  }

  // --- DEBUG: Log all incoming headers ---
  const headersList = headers();
  const headersObject: { [key: string]: string } = {};
  headersList.forEach((value, key) => {
    headersObject[key] = value;
  });
  console.log(`[Webhook Headers] Received for ${subdomain}/${gateway}:`, JSON.stringify(headersObject, null, 2));
  // --- END DEBUG ---

  const requestBody = await request.text(); // Read body as text for signature validation

  try {
    const body = JSON.parse(requestBody);
    console.log(`[Webhook] Received notification for subdomain: '${subdomain}' from gateway: '${gateway}'`);
    
    switch(gateway) {
        case 'mercadopago':
        case 'sandmercadopago': {
            const { MercadoPagoConfig, Payment } = await import('mercadopago');
            const { ObjectId } = await import('mongodb');
            const db = (await clientPromise).db('vematize');
            
            const isSandbox = gateway === 'sandmercadopago';
            console.log(`Processing Mercado Pago webhook in ${isSandbox ? 'Sandbox' : 'Production'} mode...`);
            
            if (body.type !== 'payment' || !body.data?.id) {
                console.log("[MP Webhook] Not a payment notification. Skipping.");
                return NextResponse.json({ success: true });
            }

            const tenant = await db.collection<Tenant>('tenants').findOne({ subdomain });
            if (!tenant) {
                console.error(`[MP Webhook] Tenant com subdomínio ${subdomain} não encontrado.`);
                return NextResponse.json({ success: false, message: 'Tenant not found.' }, { status: 404 });
            }

            const mpSettings = tenant.paymentIntegrations?.mercadopago;
            const secret = isSandbox 
                ? mpSettings?.sandbox_webhook_secret 
                : mpSettings?.production_webhook_secret;

            // ==========================================
            // PROTEÇÃO 3: VERIFICAÇÃO DE SECRET E MARCAÇÃO DE UNTRUSTED
            // ==========================================
            const hasSecret = !!secret;
            let webhookVerified = false;

            // Marcar tenant como untrusted se não tiver secret
            const isUntrusted = await checkAndMarkUntrustedWebhook(tenant, hasSecret);

            // In production, we must validate the signature if a secret is available.
            if (!isSandbox) {
                if (secret) {
                    const signatureHeader = headers().get('x-signature');
                    const requestId = headers().get('x-request-id');

                    // If a secret is configured, the signature header must be present.
                    if (!signatureHeader || !requestId) {
                        console.warn(`[MP Webhook] Missing x-signature or x-request-id header for ${subdomain}. Request rejected.`);
                        return NextResponse.json({ success: false, message: 'Missing signature headers.' }, { status: 400 });
                    }
                    
                    // Validate the signature
                    const searchParams = request.nextUrl.searchParams;
                    if (!isValidSignature(signatureHeader, secret, requestId, searchParams)) {
                        console.error(`[MP Webhook] Invalid signature for ${subdomain}. Request rejected.`);
                        return NextResponse.json({ success: false, message: 'Invalid signature.' }, { status: 403 });
                    }

                    console.log(`[MP Webhook] Signature for ${subdomain} validated successfully.`);
                    webhookVerified = true;

                } else {
                    // WEBHOOK NÃO CONFIÁVEL - Log detalhado + alerta
                    const requestInfo = extractRequestInfo(request);
                    console.warn(`[MP Webhook] 🚨 UNTRUSTED WEBHOOK: No webhook secret for ${gateway} on ${subdomain}`, {
                        ip: requestInfo.ip,
                        userAgent: requestInfo.userAgent,
                        timestamp: requestInfo.timestamp,
                    });
                }
            } else {
                // Sandbox também requer validação agora
                if (!secret) {
                    const requestInfo = extractRequestInfo(request);
                    console.warn(`[MP Webhook] 🚨 SANDBOX UNTRUSTED: No webhook secret for sandbox on ${subdomain}`, {
                        ip: requestInfo.ip,
                        timestamp: requestInfo.timestamp,
                    });
                }
            }

            const paymentId = body.data.id;
            const accessToken = isSandbox ? mpSettings?.sandbox_access_token : mpSettings?.production_access_token;

            if (!accessToken) {
                console.error(`[MP Webhook] Access Token not found for ${gateway} on subdomain: ${subdomain}`);
                break;
            }

            // ==========================================
            // PROTEÇÃO 4: VERIFICAÇÃO DUPLA COM PROVEDOR (API)
            // ==========================================
            // Sempre buscar status direto do Mercado Pago
            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);
            const mpPayment = await payment.get({ id: paymentId });

            if (!mpPayment || !mpPayment.external_reference) {
                 console.error(`[MP Webhook] Payment ${paymentId} not found on MP or has no external_reference.`);
                 break;
            }
            
            const saleId = mpPayment.external_reference;
            const salesCollection = db.collection('sales');
            const sale = await salesCollection.findOne({ _id: new MongoObjectId(saleId), tenantId: tenant._id.toString() } as any);

            if (!sale) {
                console.error(`[MP Webhook] Sale com ID ${saleId} não encontrado em nosso DB.`);
                break;
            }

            const newStatus = mpPayment.status === 'approved' ? 'approved' : mpPayment.status;

            if (sale.status === 'approved') {
                console.log(`[MP Webhook] Sale ${saleId} is already approved. No action taken.`);
                break;
            }

            if (newStatus === 'approved') {
                // ==========================================
                // PROTEÇÃO 5: LOG DE ALERTA PARA WEBHOOKS NÃO VERIFICADOS
                // ==========================================
                if (isUntrusted) {
                await logWebhookSecurityAlert({
                    tenantId: tenant._id.toString(),
                    subdomain: tenant.username || tenant.subdomain || 'unknown',
                    alertType: 'untrusted_webhook_payment',
                    severity: 'critical',
                        details: {
                            saleId,
                            paymentId,
                            amount: mpPayment.transaction_amount,
                            gateway: gateway,
                            webhookVerified: webhookVerified,
                            hasSecret: hasSecret,
                            productId: sale.productId,
                        },
                        timestamp: new Date(),
                    });
                }

                await salesCollection.updateOne(
                    { _id: new MongoObjectId(saleId) }, 
                    { 
                        $set: { 
                            status: 'approved', 
                            updatedAt: new Date(),
                            total_value: mpPayment.transaction_amount,
                            webhookVerified: webhookVerified,
                            providerVerified: true, // Sempre true pois verificamos via API
                        } 
                    }
                );
                console.log(`[MP Webhook] Sale ${saleId} updated to status: approved with value ${mpPayment.transaction_amount}`);

                // Iniciar a entrega do produto
                const product = await db.collection<Product>('products').findOne({ _id: new MongoObjectId(sale.productId) });
                if (!product) {
                    console.error(`[Delivery] Product with ID ${sale.productId} not found for sale ${saleId}.`);
                    break;
                }

                // Verifica se é Telegram ou Discord
                const isTelegram = !!sale.telegramChatId && !!tenant.connections?.telegram?.botToken;
                const isDiscord = !!sale.discordThreadId && !!tenant.connections?.discord?.botToken;

                if (!isTelegram && !isDiscord) {
                    console.error(`[Delivery] No bot connection found for tenant ${tenant.subdomain}.`);
                    break;
                }

                // Para Discord, usa função especializada
                if (isDiscord) {
                    try {
                        const botFactoryModule = await import('@/lib/discord/botFactory');
                        await botFactoryModule.handleDiscordPaymentConfirmation(saleId);
                    } catch (discordImportError) {
                        console.error('[Discord] Error importing botFactory:', discordImportError);
                    }
                    break; // Discord é tratado pela função especializada
                }

                // Inicializa o bot do Telegram
                let telegramBot: Telegraf | null = null;
                
                if (isTelegram) {
                    telegramBot = new Telegraf(tenant.connections!.telegram!.botToken);
                }

                const chatId = sale.telegramChatId;
                const messageId = sale.telegramMessageId;
                const discordChannelId = sale.discordChannelId;
                const discordMessageId = sale.discordMessageId;

                const deliveryMessage = tenant.botConfig?.deliveryMessage || '🎉 Pagamento aprovado! Aqui está o seu produto:';
                
                // Log detalhado do produto para debug
                console.log(`[Delivery Debug] Product found:`, {
                    id: product._id.toString(),
                    name: product.name,
                    type: product.type,
                    productSubtype: product.productSubtype,
                    hasActivationCodes: Array.isArray(product.activationCodes) && product.activationCodes.length > 0,
                    hasDescription: Boolean(product.description),
                    price: product.price
                });

                // Determina o conteúdo do produto baseado no tipo e campos disponíveis
                let productContent = 'Conteúdo não disponível.';
                let shouldRemoveCode = false;
                let codeToRemove = null;
                let inviteLinkUrl: string | null = null;

                if (product.type === 'product') {
                    if (product.productSubtype === 'activation_codes' && Array.isArray(product.activationCodes) && product.activationCodes.length > 0) {
                        codeToRemove = product.activationCodes[0];
                        productContent = `Aqui está seu código de ativação:\n\`\`\`\n${escapeMarkdown(codeToRemove)}\n\`\`\``;
                        shouldRemoveCode = true;
                    } else {
                        productContent = escapeMarkdown(product.description || '');
                    }
                } else if (product.type === 'subscription') {
                    if (product.isTelegramGroupAccess && product.telegramGroupId) {
                        try {
                            if (telegramBot) {
                                const expireDate = Math.floor(Date.now() / 1000) + 3600; // 1 hora a partir de agora
                                const inviteLink = await telegramBot.telegram.createChatInviteLink(product.telegramGroupId, {
                                    member_limit: 1,
                                    expire_date: expireDate
                                });
                                inviteLinkUrl = inviteLink.invite_link;
                                productContent = `Sua assinatura foi ativada! Use o botão abaixo para acessar o grupo.`;
                            } else {
                                productContent = `Sua assinatura foi ativada com sucesso!`;
                            }
                        } catch (e) {
                            console.error(`[Delivery] Erro ao criar link do grupo:`, e);
                            productContent = `❌ Não foi possível gerar seu link de convite. Por favor, contate o suporte.`;
                        }
                    } else {
                        productContent = `Sua assinatura foi ativada com sucesso!`;
                    }
                }
                
                // Envio para Telegram
                if (isTelegram && telegramBot && chatId) {
                    const finalMessage = `${escapeMarkdown(deliveryMessage)}\n\n*${escapeMarkdown(product.name)}*\n${productContent}`;

                    const inlineKeyboard = inviteLinkUrl
                        ? { inline_keyboard: [[{ text: 'Acessar Grupo', url: inviteLinkUrl }]] }
                        : undefined;

                    let messageEdited = false;
                    if (messageId) {
                        try {
                            await telegramBot.telegram.editMessageText(
                                chatId,
                                messageId,
                                undefined,
                                finalMessage,
                                {
                                    parse_mode: 'MarkdownV2',
                                    reply_markup: inlineKeyboard
                                }
                            );
                            messageEdited = true;
                        } catch (error: any) {
                            console.log(`[Delivery] Could not edit Telegram message ${messageId}. Proceeding to replace it.`, error.description || error.message);
                        }
                    }

                    if (!messageEdited) {
                        if (messageId) {
                            try {
                                await telegramBot.telegram.deleteMessage(chatId, messageId);
                                console.log(`[Delivery] Deleted old Telegram message ${messageId} for chat ${chatId}`);
                            } catch (deleteError) {
                                console.error(`[Delivery] Failed to delete old Telegram message ${messageId}.`, deleteError);
                            }
                        }
                        await telegramBot.telegram.sendMessage(chatId, finalMessage, {
                            parse_mode: 'MarkdownV2',
                            reply_markup: inlineKeyboard
                        });
                    }
                }

                // Nota: Envio para Discord é tratado pela função handleDiscordPaymentConfirmation() acima

                // Se for uma assinatura, registra a compra no perfil do usuário
                if (product.type === 'subscription') {
                    const usersCollection = db.collection('users');
                    let user = null;
                    
                    if (isTelegram && chatId) {
                        user = await usersCollection.findOne({ telegramId: chatId });
                    } else if (isDiscord) {
                        // Busca o usuário pelo userId da venda (que é o _id do documento user)
                        user = await usersCollection.findOne({ _id: new MongoObjectId(sale.userId) });
                    }

                    if (user) {
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + (product.durationDays || 30));

                        const purchaseRecord = {
                            _id: new MongoObjectId(),
                            productId: product._id,
                            saleId: sale._id,
                            productName: product.name,
                            type: 'subscription',
                            status: 'approved',
                            purchaseDate: new Date(),
                            expiresAt: expiresAt
                        };
                        
                        await usersCollection.updateOne(
                            { _id: user._id },
                            { $push: { purchases: purchaseRecord as any } }
                        );
                        console.log(`[Delivery] Registro de compra adicionado para o usuário ${user._id}`);
                    } else {
                        console.error(`[Delivery] User not found. Cannot add purchase record.`);
                    }
                }
                
                // Se for um produto com código de ativação, remove o código do estoque.
                if (shouldRemoveCode && codeToRemove) {
                    await db.collection('products').updateOne(
                        { _id: product._id },
                        { 
                            $set: {
                                activationCodes: (product.activationCodes || []).filter(code => code !== codeToRemove),
                                activationCodesUsed: [...(product.activationCodesUsed || []), codeToRemove]
                            }
                        }
                    );
                    console.log(`[Delivery] Código removido do estoque com sucesso:`, codeToRemove);
                }

                break; // End of delivery logic for approved payment
            } else if (newStatus === 'cancelled' && sale.status === 'pending') {
                await salesCollection.updateOne({ _id: new MongoObjectId(saleId) }, { $set: { status: 'cancelled', updatedAt: new Date() } });
                console.log(`[MP Webhook] Sale ${saleId} updated to status: cancelled`);

                if (tenant.connections?.telegram?.botToken && sale.telegramChatId && sale.telegramMessageId) {
                     const bot = new Telegraf(tenant.connections.telegram.botToken);
                     try {
                        await bot.telegram.editMessageCaption(
                            sale.telegramChatId,
                            sale.telegramMessageId,
                            undefined, // inline_message_id
                            '⏳ *PIX Expirado!*\n\nO tempo para pagamento deste QR Code acabou. Por favor, inicie a compra novamente.',
                            {
                                parse_mode: 'MarkdownV2',
                                reply_markup: {
                                    inline_keyboard: [[{ text: '⬅️ Voltar ao Início', callback_data: 'START_OVER' }]]
                                }
                            }
                        );
                        console.log(`[MP Webhook] Edited message for expired sale ${saleId}`);
                     } catch(e: any) {
                        console.error(`[MP Webhook] Failed to edit message for expired sale ${saleId}:`, e.response?.description || e.message);
                     }
                }

            } else {
                await salesCollection.updateOne({ _id: new MongoObjectId(saleId) }, { $set: { status: newStatus, updatedAt: new Date() } });
                console.log(`[MP Webhook] Sale ${saleId} updated to status: ${newStatus}`);
            }

            break;
        }
        
        default:
             console.warn(`[Webhook] Received request for unknown gateway: ${gateway}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook received.' });

  } catch (error) {
    console.error(`[Webhook Error] Failed to process webhook for ${subdomain} from ${gateway}:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Internal Server Error.' }, { status: 500 });
  }
}
