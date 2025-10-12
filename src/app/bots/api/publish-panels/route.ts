import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import type { Tenant, Product } from '@/lib/types';
import { ObjectId } from 'mongodb';

export async function POST(
    request: NextRequest,
    { params }: { params: { subdomain: string } }
) {
    try {
        const { subdomain } = params;
        const body = await request.json();
        const { panelId } = body; // Se vazio, publica todos

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection<Tenant>('tenants');
        
        const tenant = await tenantsCollection.findOne({ $or: [{ username: subdomain }, { subdomain }] });
        if (!tenant) {
            return NextResponse.json({ success: false, message: 'Tenant não encontrado.' }, { status: 404 });
        }

        if (!tenant.connections?.discord?.botToken || !tenant.connections?.discord?.clientId) {
            return NextResponse.json({ success: false, message: 'Bot do Discord não configurado.' }, { status: 400 });
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
        const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GatewayIntentBits } = await import('discord.js');

        // Cria o bot client
        const discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ]
        });

        await discordClient.login(tenant.connections.discord.botToken);

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

                    // Adiciona produtos como fields
                    products.forEach(product => {
                        const priceText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
                        const description = product.description || 'Sem descrição';
                        embed.addFields({
                            name: `🛒 ${product.name}`,
                            value: `${description}\n💰 ${priceText}`,
                            inline: false
                        });
                    });

                    // Cria botões
                    const rows: any[] = [];
                    let currentRow = new ActionRowBuilder();
                    let buttonCount = 0;

                    products.forEach((product, index) => {
                        if (buttonCount === 5) {
                            rows.push(currentRow);
                            currentRow = new ActionRowBuilder();
                            buttonCount = 0;
                        }

                        const button = new ButtonBuilder()
                            .setCustomId(`PANEL_BUY:${product._id.toString()}`)
                            .setLabel(`Comprar ${product.name}`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🛒');

                        currentRow.addComponents(button);
                        buttonCount++;

                        if (index === products.length - 1) {
                            rows.push(currentRow);
                        }
                    });

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
                                { subdomain, 'discordSettings.panels.id': panel.id },
                                { $set: { 'discordSettings.panels.$.messageId': message.id } }
                            );
                            publishResults.push({ panelId: panel.id, success: true, message: 'Novo painel criado.' });
                        }
                    } else {
                        const message = await (channel as any).send({ embeds: [embed], components: rows });
                        await tenantsCollection.updateOne(
                            { subdomain, 'discordSettings.panels.id': panel.id },
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

