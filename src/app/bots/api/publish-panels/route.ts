import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Tenant, Product } from '@/lib/types';
import { ObjectId } from 'mongodb';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export async function POST(request: NextRequest) {
    try {
        // Obtém o tenant da sessão
        const sessionTenant = await getTenantFromSession();
        
        const body = await request.json();
        const { panelId } = body; // Se vazio, publica todos

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection<Tenant>('tenants');
        
        // Busca o tenant completo com todas as configurações
        const tenant = await tenantsCollection.findOne({ _id: new ObjectId(sessionTenant._id) });
        if (!tenant) {
            return NextResponse.json({ success: false, message: 'Tenant não encontrado.' }, { status: 404 });
        }

        if (!tenant.connections?.discord?.botToken) {
            return NextResponse.json({ success: false, message: 'Bot do Discord não configurado. Configure o token na aba Conexão.' }, { status: 400 });
        }

        if (!tenant.discordSettings?.panels || tenant.discordSettings.panels.length === 0) {
            return NextResponse.json({ success: false, message: 'Nenhum painel configurado.' }, { status: 400 });
        }

        // Filtra painéis para publicar
        const panelsToPublish = panelId 
            ? tenant.discordSettings.panels.filter(p => p.id === panelId && p.isActive)
            : tenant.discordSettings.panels.filter(p => p.isActive);

        if (panelsToPublish.length === 0) {
            return NextResponse.json({ success: false, message: 'Nenhum painel ativo para publicar.' }, { status: 400 });
        }

        // Importação dinâmica do discord.js
        const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, GatewayIntentBits } = await import('discord.js');

        // Cria o bot client
        const discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ]
        });

        console.log('[Discord] Fazendo login do bot...');
        await discordClient.login(tenant.connections.discord.botToken);
        
        // Aguarda o bot ficar pronto
        await new Promise((resolve) => {
            if (discordClient.isReady()) {
                resolve(true);
            } else {
                discordClient.once('clientReady', () => resolve(true));
            }
        });
        
        console.log(`[Discord] Bot conectado como ${discordClient.user?.tag}`);

        const publishResults: any[] = [];

        try {
            for (const panel of panelsToPublish) {
                try {
                    // Busca os produtos
                    const productsCollection = db.collection<Product>('products');
                    const products = await productsCollection.find({
                        tenantId: tenant._id.toString(),
                        _id: { $in: panel.productIds.map(id => new ObjectId(id)) }
                    }).toArray();

                    if (products.length === 0) {
                        publishResults.push({ panelId: panel.id, success: false, message: 'Nenhum produto encontrado.' });
                        continue;
                    }

                    const channel = await discordClient.channels.fetch(panel.channelId);
                    if (!channel || !channel.isTextBased()) {
                        publishResults.push({ panelId: panel.id, success: false, message: 'Canal inválido.' });
                        continue;
                    }

                    // Cria o embed
                    const embed = new EmbedBuilder()
                        .setTitle(panel.embedConfig.title)
                        .setColor(parseInt(panel.embedConfig.color.replace('#', ''), 16))
                        .setTimestamp();

                    if (panel.embedConfig.description) {
                        embed.setDescription(panel.embedConfig.description);
                    }

                    if (panel.embedConfig.imageUrl) {
                        embed.setImage(panel.embedConfig.imageUrl);
                    }

                    if (panel.embedConfig.thumbnailUrl) {
                        embed.setThumbnail(panel.embedConfig.thumbnailUrl);
                    }

                    // Adiciona lista de produtos no embed (apenas nomes)
                    if (products.length > 0) {
                        const productList = products.map(p => `✅ ${p.name}`).join('\n');
                        embed.addFields({
                            name: '📦 Produtos Disponíveis',
                            value: productList,
                            inline: false
                        });
                    }

                    // Cria Select Menu com os produtos
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`PANEL_SELECT:${panel.id}`)
                        .setPlaceholder('📋 Clique aqui para ver as opções')
                        .setMinValues(1)
                        .setMaxValues(1);

                    // Adiciona cada produto como opção do menu
                    products.forEach((product) => {
                        const priceText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
                        
                        // Determina estoque
                        let stockText = '';
                        if (product.productSubtype === 'activation_codes') {
                            const availableStock = product.activationCodes?.length || 0;
                            stockText = availableStock > 0 ? `📦 | Estoque: ${availableStock}` : '❌ | Estoque: 0';
                        } else if (product.stock !== null && product.stock !== undefined) {
                            stockText = product.stock > 0 ? `📦 | Estoque: ${product.stock}` : '❌ | Estoque: 0';
                        } else {
                            stockText = '♾️ | Estoque ilimitado';
                        }

                        const option = new StringSelectMenuOptionBuilder()
                            .setLabel(product.name.substring(0, 100)) // Discord limita a 100 chars
                            .setValue(product._id.toString())
                            .setDescription(`💰 | Valor: ${priceText} - ${stockText}`)
                            .setEmoji('🛒');

                        selectMenu.addOptions(option);
                    });

                    const rows = [
                        new ActionRowBuilder().addComponents(selectMenu)
                    ];

                    // Envia ou atualiza mensagem
                    if (panel.messageId) {
                        try {
                            const message = await (channel as any).messages.fetch(panel.messageId);
                            await message.edit({ embeds: [embed], components: rows });
                            publishResults.push({ panelId: panel.id, success: true, message: 'Painel atualizado.' });
                        } catch (e) {
                            // Se falhar ao atualizar, cria nova mensagem
                            const message = await (channel as any).send({ embeds: [embed], components: rows });
                            await tenantsCollection.updateOne(
                                { _id: tenant._id, 'discordSettings.panels.id': panel.id },
                                { $set: { 'discordSettings.panels.$.messageId': message.id } }
                            );
                            publishResults.push({ panelId: panel.id, success: true, message: 'Novo painel criado.' });
                        }
                    } else {
                        const message = await (channel as any).send({ embeds: [embed], components: rows });
                        await tenantsCollection.updateOne(
                            { _id: tenant._id, 'discordSettings.panels.id': panel.id },
                            { $set: { 'discordSettings.panels.$.messageId': message.id } }
                        );
                        publishResults.push({ panelId: panel.id, success: true, message: 'Painel publicado.' });
                    }

                } catch (error: any) {
                    console.error(`[Discord] Error publishing panel ${panel.id}:`, error);
                    publishResults.push({ panelId: panel.id, success: false, message: error.message });
                }
            }
        } finally {
            await discordClient.destroy();
        }

        const successCount = publishResults.filter(r => r.success).length;
        return NextResponse.json({ 
            success: true, 
            message: `${successCount} de ${publishResults.length} painel(is) publicado(s).`,
            results: publishResults 
        });

    } catch (error: any) {
        console.error('[Discord] Error in publish-panels route:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Erro ao publicar painéis.' 
        }, { status: 500 });
    }
}

