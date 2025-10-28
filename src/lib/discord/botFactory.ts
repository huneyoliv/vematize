import { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder,
    ChannelType,
    TextChannel,
    PermissionFlagsBits,
    ThreadChannel
} from 'discord.js';
import clientPromise from '@/lib/mongodb';
import type { Tenant, BotStep, BotButton, Product, User, Sale } from '@/lib/types';
import { Db, ObjectId } from 'mongodb';
import { createMercadoPagoPreference, createMercadoPagoPixPayment } from '@/lib/mercadopago';

// ===== HELPER FUNCTIONS =====

function replacePlaceholders(text: string, username: string): string {
    if (!text) return '';
    return text.replace(/{userName}/g, username || 'usuário');
}

function buildActionRow(buttons: BotButton[] | undefined): ActionRowBuilder<ButtonBuilder>[] | undefined {
    if (!buttons || buttons.length === 0) {
        return undefined;
    }
    
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    
    for (let i = 0; i < buttons.length; i += 5) {
        const buttonsChunk = buttons.slice(i, i + 5);
        const row = new ActionRowBuilder<ButtonBuilder>();
        
        buttonsChunk.forEach(button => {
            const action = button.action;
            const customId = action.payload ? `${action.type}:${action.payload}` : action.type;
            
            const discordButton = new ButtonBuilder()
                .setCustomId(customId)
                .setLabel(button.text)
                .setStyle(ButtonStyle.Primary);
            
            row.addComponents(discordButton);
        });
        
        rows.push(row);
    }
    
    return rows;
}

async function executeStep(interaction: any, step: BotStep) {
    const messageText = replacePlaceholders(step.message, interaction.user.username);
    const components = buildActionRow(step.buttons);

    const embed = new EmbedBuilder()
        .setDescription(messageText)
        .setColor(0x5865F2);

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
                components: components || []
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: components || [],
                ephemeral: false
            });
        }
    } catch (e: any) {
        console.warn('[Discord] Failed to process step:', e.message);
    }
}

// ===== CART FUNCTIONS =====

async function createCartThread(
    client: Client,
    channelId: string,
    userId: string,
    productName: string,
    categoryId?: string
): Promise<ThreadChannel | null> {
    try {
        let channel;
        
        // Se há uma categoria especificada, tenta criar um canal nela
        if (categoryId) {
            const category = await client.channels.fetch(categoryId);
            if (!category) {
                console.warn('[Discord] Category not found, using original channel');
                channel = await client.channels.fetch(channelId);
            } else {
                // Cria um canal privado na categoria
                const guild = client.guilds.cache.first();
                if (!guild) return null;
                
                const privateChannel = await guild.channels.create({
                    name: `🛒-carrinho-${userId.slice(-4)}`,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: userId,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ],
                        },
                        {
                            id: client.user!.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ManageChannels
                            ],
                        }
                    ]
                });
                
                return privateChannel as any;
            }
        } else {
            channel = await client.channels.fetch(channelId);
        }
        
        if (!channel || !channel.isTextBased()) return null;
        
        // Cria um thread
        const thread = await (channel as TextChannel).threads.create({
            name: `🛒 Carrinho - ${productName}`,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            reason: `Carrinho de compra para ${productName}`
        });
        
        // Adiciona o usuário ao thread
        await thread.members.add(userId);
        
        return thread;
    } catch (error: any) {
        console.error('[Discord] Error creating cart thread:', error);
        return null;
    }
}

async function updateCartMessage(
    thread: ThreadChannel,
    db: Db,
    sale: Sale,
    product: Product,
    tenant: Tenant
) {
    try {
        const quantity = sale.quantity || 1;
        const unitPrice = product.price;
        let totalPrice = unitPrice * quantity;
        let discountApplied = false;
        let discountAmount = 0;

        // Verifica se há cupom aplicado
        if (sale.couponCode) {
            const couponsCol = db.collection('coupons');
            const coupon = await couponsCol.findOne({
                tenantId: tenant._id.toString(),
                code: sale.couponCode.toUpperCase(),
                isActive: true
            });

            if (coupon) {
                if (coupon.type === 'percentage') {
                    discountAmount = (totalPrice * coupon.value) / 100;
                } else if (coupon.type === 'fixed_amount') {
                    discountAmount = coupon.value;
                }
                totalPrice -= discountAmount;
                discountApplied = true;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🛒 Revisão do Pedido')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Produto', value: product.name, inline: true },
                { name: 'Quantidade', value: `${quantity}x`, inline: true },
                { name: 'Valor Unitário', value: `R$ ${unitPrice.toFixed(2).replace('.', ',')}`, inline: true },
            );

        if (product.description) {
            embed.setDescription(product.description);
        }

        if (discountApplied) {
            embed.addFields(
                { name: 'Subtotal', value: `R$ ${(unitPrice * quantity).toFixed(2).replace('.', ',')}`, inline: true },
                { name: 'Desconto', value: `- R$ ${discountAmount.toFixed(2).replace('.', ',')}`, inline: true },
                { name: '💰 **Total**', value: `**R$ ${totalPrice.toFixed(2).replace('.', ',')}**`, inline: true }
            );
    } else {
            embed.addFields(
                { name: '💰 **Total**', value: `**R$ ${totalPrice.toFixed(2).replace('.', ',')}**`, inline: false }
            );
        }

        const row1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`CART_EDIT_QTY:${sale._id.toString()}`)
                    .setLabel('✏️ Editar Quantidade')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`CART_APPLY_COUPON:${sale._id.toString()}`)
                    .setLabel('🎫 Usar Cupom')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`CART_CHECKOUT:${sale._id.toString()}`)
                    .setLabel('✅ Ir para o Pagamento')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`CART_CANCEL:${sale._id.toString()}`)
                    .setLabel('❌ Cancelar Compra')
                    .setStyle(ButtonStyle.Danger)
            );

        await thread.send({ embeds: [embed], components: [row1, row2] });
    } catch (error) {
        console.error('[Discord] Error updating cart message:', error);
    }
}

async function deliverProduct(
    client: Client,
    db: Db,
    sale: Sale,
    product: Product,
    user: User,
    tenant: Tenant,
    thread: ThreadChannel
) {
    try {
        const discordSettings = tenant.discordSettings;
        const deliveryType = discordSettings?.deliveryType || 'automatic';

        if (deliveryType === 'automatic') {
            // Entrega automática
            let deliveryContent = '';

            if (product.productSubtype === 'activation_codes' && product.activationCodes && product.activationCodes.length > 0) {
                // Entrega código de ativação
                const code = product.activationCodes[0];
                
                // Remove o código do estoque
                await db.collection('products').updateOne(
                    { _id: (product as any)._id },
                    { 
                        $pull: { activationCodes: code },
                        $push: { activationCodesUsed: code }
                    } as any
                );

                deliveryContent = `🎉 **Código de Ativação:**\n\`\`\`\n${code}\n\`\`\``;
            } else if (product.productSubtype === 'digital_file' && product.hostedFileUrl) {
                // Entrega arquivo digital
                deliveryContent = `🎉 **Link para Download:**\n${product.hostedFileUrl}`;
                } else {
                // Produto padrão
                deliveryContent = `🎉 **Produto adquirido com sucesso!**\n\nVocê adquiriu: ${product.name}`;
            }

            const deliveryMessage = discordSettings?.deliveryMessage || 'Obrigado pela sua compra!';
            
            const deliveryEmbed = new EmbedBuilder()
                .setTitle('✅ Compra Aprovada!')
                .setDescription(`${deliveryMessage}\n\n${deliveryContent}`)
                .setColor(0x00FF00)
                .setTimestamp();

            await thread.send({ embeds: [deliveryEmbed] });

            // Registra a compra no usuário
            await db.collection('users').updateOne(
                { _id: user._id },
                {
                    $push: {
                        purchases: {
                            purchaseId: sale._id.toString(),
                            productId: (product as any)._id.toString(),
                            productName: product.name,
                            purchaseDate: new Date(),
                            type: product.type,
                            status: 'approved'
                        }
                    }
                } as any
            );

        } else if (deliveryType === 'manual_role' && discordSettings?.deliveryRoleId) {
            // Adiciona membros com o cargo ao thread para entrega manual
            try {
                const guild = client.guilds.cache.first();
                if (guild) {
                    const role = await guild.roles.fetch(discordSettings.deliveryRoleId);
                    
                    if (role) {
                        // Busca todos os membros com esse cargo
                        await guild.members.fetch();
                        const membersWithRole = guild.members.cache.filter(member => 
                            member.roles.cache.has(role.id) && !member.user.bot
                        );

                        // Adiciona os membros ao thread
                        let addedCount = 0;
                        for (const [, member] of membersWithRole) {
                            try {
                                if (thread.isThread()) {
                                    await thread.members.add(member.id);
                                    addedCount++;
                                }
                            } catch (addError) {
                                console.error(`[Discord] Error adding member ${member.id} to thread:`, addError);
                            }
    }

    const embed = new EmbedBuilder()
                            .setTitle('🔔 Nova Venda - Entrega Manual')
                            .setDescription(`**Produto:** ${product.name}\n**Cliente:** <@${user.discordId}>\n**Valor:** R$ ${product.price.toFixed(2).replace('.', ',')}\n\n<@&${role.id}> Por favor, entregue o produto ao cliente.\n\n✅ ${addedCount} membro(s) com cargo de staff adicionado(s) ao chat.`)
                            .setColor(0xFFAA00)
                            .setTimestamp();
                        
                        await thread.send({ embeds: [embed] });

                        // Registra a compra no perfil do usuário
                        await db.collection('users').updateOne(
                            { _id: user._id },
                            {
                                $push: {
                                    purchases: {
                                        purchaseId: sale._id.toString(),
                                        productId: (product as any)._id.toString(),
                                        productName: product.name,
                                        purchaseDate: new Date(),
                                        type: product.type,
                                        status: 'approved'
                                    }
                                }
                            } as any
                        );
                    }
                }
            } catch (error) {
                console.error('[Discord] Error adding staff to thread:', error);
            }

        } else if (deliveryType === 'manual_notify' && discordSettings?.notifyRoleId) {
            // Apenas notifica o cargo sem adicionar ao thread
            try {
                const guild = client.guilds.cache.first();
                if (guild) {
                    const role = await guild.roles.fetch(discordSettings.notifyRoleId);
                    
                    if (role) {
                        const embed = new EmbedBuilder()
                            .setTitle('🔔 Nova Venda Pendente')
                            .setDescription(`**Produto:** ${product.name}\n**Cliente:** <@${user.discordId}>\n**Valor:** R$ ${product.price.toFixed(2).replace('.', ',')}\n\n<@&${role.id}> Por favor, entregue o produto ao cliente.`)
                            .setColor(0xFFAA00)
                            .setTimestamp();
                        
                        await thread.send({ embeds: [embed] });
                    }
                }
            } catch (error) {
                console.error('[Discord] Error notifying sellers:', error);
            }
        }

        // Log de venda
        if (discordSettings?.salesLogChannelId) {
            try {
                const logChannel = await client.channels.fetch(discordSettings.salesLogChannelId);
                if (logChannel && logChannel.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('💰 Nova Venda Realizada')
                        .addFields(
                            { name: 'Produto', value: product.name, inline: true },
                            { name: 'Cliente', value: user.name || user.username || 'Desconhecido', inline: true },
                            { name: 'Valor', value: `R$ ${product.price.toFixed(2).replace('.', ',')}`, inline: true },
                            { name: 'ID da Venda', value: sale._id.toString(), inline: false }
                        )
                        .setColor(0x00FF00)
                        .setTimestamp();
                    
                    await (logChannel as TextChannel).send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('[Discord] Error logging sale:', error);
            }
        }

    } catch (error) {
        console.error('[Discord] Error in deliverProduct:', error);
    }
}

// ===== MAIN BOT INSTANCE =====

export function createDiscordBotInstance(token: string, clientId: string) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ]
    });

    let tenantCache: Tenant | null = null;

    client.once('clientReady', async () => {
        console.log(`[Discord] Bot ready as ${client.user?.tag}`);
        
        try {
            const dbClient = await clientPromise;
            const db = dbClient.db('vematize');
            tenantCache = await db.collection<Tenant>('tenants').findOne({ "connections.discord.botToken": token });
            
            if (!tenantCache) {
                console.warn(`[Discord] Tenant não encontrado`);
                return;
            }

            console.log(`[Discord] Tenant '${tenantCache.subdomain}' encontrado`);

            // Registra comandos slash
            const rest = new REST({ version: '10' }).setToken(token);
            
            const commands = [
                new SlashCommandBuilder()
                    .setName('start')
                    .setDescription('Inicia o bot'),
                new SlashCommandBuilder()
                    .setName('perfil')
                    .setDescription('Mostra seu perfil e compras')
            ];

            // Adiciona comandos de fluxos opcionais
            if (tenantCache.botConfig?.flows) {
                tenantCache.botConfig.flows.forEach((flow: any) => {
                    if (flow.trigger && flow.trigger.startsWith('/') && flow.trigger !== '/start') {
                        const commandName = flow.trigger.slice(1);
                        commands.push(
                            new SlashCommandBuilder()
                                .setName(commandName)
                                .setDescription(flow.name || `Comando ${commandName}`)
                        );
                    }
                });
            }

            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands.map(cmd => cmd.toJSON()) }
            );

            console.log('[Discord] Commands registered successfully');
        } catch (error) {
            console.error('[Discord] Error in ready handler:', error);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        try {
            // Busca tenant
            if (!tenantCache) {
                const dbClient = await clientPromise;
                const db = dbClient.db('vematize');
                tenantCache = await db.collection<Tenant>('tenants').findOne({ "connections.discord.botToken": token });
                
                if (!tenantCache) {
                    if (interaction.isRepliable()) {
                        await interaction.reply({ content: 'Bot não configurado.', ephemeral: true });
                    }
                    return;
                }
            }

            const tenant = tenantCache;

            // Verifica se está ativo
            if (tenant.subscriptionStatus === 'inactive') {
                const inactiveMessage = tenant.botConfig?.inactiveSubscriptionMessage || 'Serviço temporariamente suspenso.';
                if (interaction.isRepliable()) {
                    await interaction.reply({ content: inactiveMessage, ephemeral: true });
                }
                return;
            }

            const db = (await clientPromise).db('vematize');
            const usersCollection = db.collection<User>('users');

            // Upsert user
            await usersCollection.updateOne(
                { discordId: interaction.user.id, tenantId: tenant._id.toString() },
                { 
                    $set: { 
                        name: interaction.user.username,
                        username: interaction.user.username
                    },
                    $setOnInsert: { 
                        discordId: interaction.user.id,
                        tenantId: tenant._id.toString(),
                        createdAt: new Date(),
                        state: 'active',
                        plan: 'Nenhum'
                    }
                },
                { upsert: true }
            );

            const user = await usersCollection.findOne({ discordId: interaction.user.id, tenantId: tenant._id.toString() });
            if (!user) return;

            // ===== COMANDOS SLASH =====
            if (interaction.isChatInputCommand()) {
                const commandName = `/${interaction.commandName}`;

                // Comandos de fluxo opcional
                const botConfig = tenant.botConfig;
                if (botConfig?.flows) {
                const flow = botConfig.flows.find((f: any) => f.trigger === commandName);
                if (flow) {
                    const startStep = flow.steps.find((s: BotStep) => s.id === flow.startStepId);
                    if (startStep) {
                        await executeStep(interaction, startStep);
                            return;
                        }
                    }
                }

                // Comando /perfil
                if (commandName === '/perfil') {
                    let profileDescription = `**Perfil de ${user.name || 'Usuário'}**\n\n`;
                    
                    if (!user.purchases || user.purchases.length === 0) {
                        profileDescription += "Você ainda não fez nenhuma compra.";
                } else {
                        profileDescription += "**Suas Compras:**\n\n";
                        user.purchases.forEach((purchase: any) => {
                            const purchaseDate = new Date(purchase.purchaseDate).toLocaleDateString('pt-BR');
                            profileDescription += `🛍️ **${purchase.productName}** - ${purchaseDate}\n`;
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setDescription(profileDescription)
                        .setColor(0x5865F2);

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
            }

            // ===== SELECT MENU (PAINÉIS DE VENDAS) =====
            if (interaction.isStringSelectMenu()) {
                const customId = interaction.customId;
                const [action, panelId] = customId.split(':');

                if (action === 'PANEL_SELECT') {
                    await interaction.deferReply({ ephemeral: true });
                    
                    const productId = interaction.values[0]; // Produto selecionado
                    const productsCol = db.collection<Product>('products');
                    const product = await productsCol.findOne({ 
                        _id: new ObjectId(productId), 
                        tenantId: tenant._id.toString() 
                    });

                    if (!product) {
                        await interaction.editReply({ content: '❌ Produto não encontrado.' });
                        return;
                    }

                    // Verifica se já tem um carrinho pendente
                    const salesCol = db.collection<Sale>('sales');
                    let existingSale = await salesCol.findOne({
                        tenantId: tenant._id.toString(),
                        userId: user._id.toString(),
                        productId: product._id.toString(),
                        status: 'pending'
                    });

                    if (existingSale && existingSale.discordThreadId) {
                        try {
                            const existingThread = await client.channels.fetch(existingSale.discordThreadId);
                            if (existingThread) {
                                await interaction.editReply({ 
                                    content: `✅ Você já tem um carrinho aberto para este produto: <#${existingSale.discordThreadId}>` 
                                });
                                return;
                            }
                        } catch (e) {
                            // Thread não existe mais, continua criando novo
                        }
                    }

                    // Cria thread de carrinho
                    const thread = await createCartThread(
                        client,
                        interaction.channelId,
                        interaction.user.id,
                        product.name,
                        tenant.discordSettings?.cartCategoryId
                    );

                    if (!thread) {
                        await interaction.editReply({ content: '❌ Erro ao criar carrinho.' });
                        return;
                    }

                    // Cria ou atualiza a venda
                    if (existingSale) {
                        await salesCol.updateOne(
                            { _id: existingSale._id },
                            { 
                                $set: { 
                                    discordThreadId: thread.id,
                                    discordChannelId: interaction.channelId,
                                    quantity: 1
                                } 
                            }
                        );
                        existingSale.discordThreadId = thread.id;
                    } else {
                        const newSale: Sale = {
                            _id: new ObjectId(),
                            tenantId: tenant._id.toString(),
                            productId: product._id.toString(),
                            userId: user._id.toString(),
                            discordThreadId: thread.id,
                            discordChannelId: interaction.channelId,
                            quantity: 1,
                            status: 'pending',
                            paymentGateway: 'mercadopago',
                            createdAt: new Date(),
                            paymentDetails: {}
                        };
                        await salesCol.insertOne(newSale);
                        existingSale = newSale;
                    }

                    await interaction.editReply({ 
                        content: `✅ Seu carrinho foi criado! <#${thread.id}>` 
                    });

                    // Envia mensagem de boas-vindas no carrinho
                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(`🛒 Carrinho de Compras`)
                        .setDescription(`Olá <@${user.discordId}>!\n\nVocê está comprando: **${product.name}**`)
                        .setColor(0x5865F2);

                    await thread.send({ embeds: [welcomeEmbed] });
                    await updateCartMessage(thread, db, existingSale, product, tenant);
                    return;
                }
            }

            // ===== BOTÕES =====
            if (interaction.isButton()) {
                const customId = interaction.customId;
                const [action, ...params] = customId.split(':');

                // ===== PAINEL DE VENDAS: Botão Comprar (LEGADO) =====
                if (action === 'PANEL_BUY') {
                    await interaction.deferReply({ ephemeral: true });
                    
                    const productId = params[0];
                    const productsCol = db.collection<Product>('products');
                    const product = await productsCol.findOne({ 
                        _id: new ObjectId(productId), 
                        tenantId: tenant._id.toString() 
                    });

                    if (!product) {
                        await interaction.editReply({ content: '❌ Produto não encontrado.' });
                        return;
                    }

                    // Verifica se já tem um carrinho pendente
                    const salesCol = db.collection<Sale>('sales');
                    let existingSale = await salesCol.findOne({
                        tenantId: tenant._id.toString(),
                        userId: user._id.toString(),
                        productId: product._id.toString(),
                        status: 'pending'
                    });

                    if (existingSale && existingSale.discordThreadId) {
                        try {
                            const existingThread = await client.channels.fetch(existingSale.discordThreadId);
                            if (existingThread) {
                                await interaction.editReply({ 
                                    content: `✅ Você já tem um carrinho aberto para este produto: <#${existingSale.discordThreadId}>` 
                                });
                                return;
                            }
                        } catch (e) {
                            // Thread não existe mais, continua criando novo
                        }
                    }

                    // Cria thread de carrinho
                    const thread = await createCartThread(
                        client,
                        interaction.channelId,
                        interaction.user.id,
                        product.name,
                        tenant.discordSettings?.cartCategoryId
                    );

                    if (!thread) {
                        await interaction.editReply({ content: '❌ Erro ao criar carrinho.' });
                        return;
                    }

                    // Cria ou atualiza a venda
                    if (existingSale) {
                        await salesCol.updateOne(
                            { _id: existingSale._id },
                            { 
                                $set: { 
                                    discordThreadId: thread.id,
                                    discordChannelId: interaction.channelId,
                                    quantity: 1
                                } 
                            }
                        );
                        existingSale.discordThreadId = thread.id;
                        } else {
                        const newSale: Sale = {
                            _id: new ObjectId(),
                            tenantId: tenant._id.toString(),
                            productId: product._id.toString(),
                            userId: user._id.toString(),
                            discordThreadId: thread.id,
                            discordChannelId: interaction.channelId,
                            quantity: 1,
                            status: 'pending',
                            paymentGateway: 'mercadopago',
                            createdAt: new Date(),
                            paymentDetails: {}
                        };
                        await salesCol.insertOne(newSale);
                        existingSale = newSale;
                    }

                    await interaction.editReply({ 
                        content: `✅ Seu carrinho foi criado! <#${thread.id}>` 
                    });

                    // Envia mensagem de boas-vindas no carrinho
                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(`🛒 Carrinho de Compras`)
                        .setDescription(`Olá <@${user.discordId}>!\n\nVocê está comprando: **${product.name}**`)
                        .setColor(0x5865F2);

                    await thread.send({ embeds: [welcomeEmbed] });
                    await updateCartMessage(thread, db, existingSale, product, tenant);
                            return;
                        }

                // ===== CARRINHO: Editar Quantidade =====
                if (action === 'CART_EDIT_QTY') {
                    const saleId = params[0];
                    await interaction.reply({ 
                        content: '✏️ Digite a nova quantidade (ex: 2, 3, 10...):',
                        ephemeral: true 
                    });

                    // Aguarda resposta do usuário
                    const filter = (m: any) => m.author.id === interaction.user.id;
                    const collector = (interaction.channel as any)?.createMessageCollector({ filter, time: 30000, max: 1 });

                    collector?.on('collect', async (message: any) => {
                        const newQty = parseInt(message.content);
                        if (isNaN(newQty) || newQty < 1) {
                            await message.reply('❌ Quantidade inválida.');
                            return;
                        }
                        
                        const salesCol = db.collection<Sale>('sales');
                        const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                        if (!sale) return;

                        await salesCol.updateOne(
                            { _id: new ObjectId(saleId) },
                            { $set: { quantity: newQty } }
                        );

                        const productsCol = db.collection<Product>('products');
                        const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
                        if (!product) return;

                        sale.quantity = newQty;
                        await message.reply(`✅ Quantidade atualizada para ${newQty}!`);
                        
                        if (interaction.channel) {
                            await updateCartMessage(interaction.channel as ThreadChannel, db, sale, product, tenant);
                        }
                    });
                    return;
                }

                // ===== CARRINHO: Aplicar Cupom =====
                if (action === 'CART_APPLY_COUPON') {
                    const saleId = params[0];
                    await interaction.reply({ 
                        content: '🎫 Digite o código do cupom:',
                        ephemeral: true 
                    });

                    const filter = (m: any) => m.author.id === interaction.user.id;
                    const collector = (interaction.channel as any)?.createMessageCollector({ filter, time: 30000, max: 1 });

                    collector?.on('collect', async (message: any) => {
                        const couponCode = message.content.toUpperCase().trim();
                        
                        const couponsCol = db.collection('coupons');
                        const coupon = await couponsCol.findOne({
                            tenantId: tenant._id.toString(),
                            code: couponCode,
                            isActive: true
                        });

                        if (!coupon) {
                            await message.reply('❌ Cupom inválido ou expirado.');
                            return;
                        }

                        // Verifica expiração
                        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
                            await message.reply('❌ Este cupom expirou.');
                            return;
                        }

                        const salesCol = db.collection<Sale>('sales');
                        await salesCol.updateOne(
                            { _id: new ObjectId(saleId) },
                            { $set: { couponCode: couponCode } }
                        );

                        const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                        if (!sale) return;

                        const productsCol = db.collection<Product>('products');
                        const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
                        if (!product) return;

                        await message.reply(`✅ Cupom **${couponCode}** aplicado com sucesso!`);
                        
                        if (interaction.channel) {
                            await updateCartMessage(interaction.channel as ThreadChannel, db, sale, product, tenant);
                        }
                    });
                    return;
                }

                // ===== CARRINHO: Finalizar Compra =====
                if (action === 'CART_CHECKOUT') {
                    await interaction.deferUpdate();
                    
                    const saleId = params[0];
                        const salesCol = db.collection<Sale>('sales');
                    const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                    if (!sale) return;

                    const productsCol = db.collection<Product>('products');
                    const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
                    if (!product) return;

                    // Calcula preço final
                    let finalPrice = product.price * (sale.quantity || 1);

                    if (sale.couponCode) {
                        const couponsCol = db.collection('coupons');
                        const coupon = await couponsCol.findOne({
                            tenantId: tenant._id.toString(),
                            code: sale.couponCode,
                            isActive: true
                        });

                        if (coupon) {
                            if (coupon.type === 'percentage') {
                                finalPrice -= (finalPrice * coupon.value) / 100;
                            } else if (coupon.type === 'fixed_amount') {
                                finalPrice -= coupon.value;
                            }
                        }
                    }

                    // Opções de pagamento
                    const paymentEmbed = new EmbedBuilder()
                        .setTitle('💳 Escolha a Forma de Pagamento')
                        .setDescription(`**Total a pagar:** R$ ${finalPrice.toFixed(2).replace('.', ',')}`)
                        .setColor(0x5865F2);

                    const paymentRow = new ActionRowBuilder<ButtonBuilder>();

                    if (product.paymentMethods?.pix && product.paymentMethods.pix !== 'none') {
                        paymentRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`PAY_PIX:${saleId}:${product.paymentMethods.pix}`)
                                .setLabel('PIX')
                                .setEmoji('📱')
                                .setStyle(ButtonStyle.Primary)
                        );
                    }

                    if (product.paymentMethods?.credit_card && product.paymentMethods.credit_card !== 'none') {
                        paymentRow.addComponents(
                                        new ButtonBuilder()
                                .setCustomId(`PAY_CARD:${saleId}:${product.paymentMethods.credit_card}`)
                                .setLabel('Cartão de Crédito')
                                .setEmoji('💳')
                                .setStyle(ButtonStyle.Primary)
                        );
                    }

                    if (paymentRow.components.length === 0) {
                        await interaction.followUp({ 
                            content: '❌ Nenhuma forma de pagamento disponível para este produto.',
                            ephemeral: true 
                        });
                        return;
                    }

                    await (interaction.channel as any)?.send({ embeds: [paymentEmbed], components: [paymentRow] });
                    return;
                }

                // ===== CARRINHO: Cancelar =====
                if (action === 'CART_CANCEL') {
                    const saleId = params[0];
                    await interaction.deferUpdate();

                    await db.collection('sales').updateOne(
                                        { _id: new ObjectId(saleId) }, 
                        { $set: { status: 'cancelled' } }
                    );

                    const cancelEmbed = new EmbedBuilder()
                        .setDescription('❌ Compra cancelada.')
                                        .setColor(0xFF0000);

                    await (interaction.channel as any)?.send({ embeds: [cancelEmbed] });

                    // Arquiva o thread
                    if (interaction.channel && 'setArchived' in interaction.channel) {
                        setTimeout(async () => {
                            try {
                                await (interaction.channel as ThreadChannel).setArchived(true);
                            } catch (e) {
                                console.error('[Discord] Error archiving thread:', e);
                            }
                        }, 5000);
                    }
                    return;
                }

                // ===== PAGAMENTO: PIX =====
                if (action === 'PAY_PIX') {
                    await interaction.deferUpdate();
                    
                    const [saleId, gateway] = params;
                    const salesCol = db.collection<Sale>('sales');
                    const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                    if (!sale) return;

                    const productsCol = db.collection<Product>('products');
                    const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
                    if (!product) return;

                    // Se já tem QR Code gerado, mostra novamente
                    if (sale.paymentDetails?.qrCode && sale.paymentDetails?.qrCodeBase64) {
                        const qrCodeBuffer = Buffer.from(sale.paymentDetails.qrCodeBase64, 'base64');
                                    const pixEmbed = new EmbedBuilder()
                            .setTitle(`PIX - ${product.name}`)
                            .setDescription(`✅ Pague com o QR Code ou copie o código abaixo:\n\n\`\`\`\n${sale.paymentDetails.qrCode}\n\`\`\`\n\nExpira em 30 minutos.`)
                                        .setImage('attachment://qrcode.png')
                                        .setColor(0x00FF00);
                                    
                        await (interaction.channel as any)?.send({ 
                                        embeds: [pixEmbed], 
                                        files: [{ attachment: qrCodeBuffer, name: 'qrcode.png' }]
                                    });
                                    return;
                                }

                    const loadingEmbed = new EmbedBuilder()
                        .setDescription('⏳ Gerando PIX...')
                        .setColor(0xFFAA00);
                    
                    const loadingMsg = await (interaction.channel as any)?.send({ embeds: [loadingEmbed] });

                    if (gateway === 'mercadopago') {
                        const result = await createMercadoPagoPixPayment(tenant, product, saleId, user._id.toString());
                                
                                if (result.success && result.qrCode && result.qrCodeBase64 && result.paymentId) {
                            await salesCol.updateOne(
                                { _id: new ObjectId(saleId) },
                                { 
                                        $set: { 
                                            "paymentDetails.qrCode": result.qrCode,
                                            "paymentDetails.qrCodeBase64": result.qrCodeBase64,
                                            "paymentDetails.paymentId": result.paymentId,
                                        }
                                }
                            );

                                    const qrCodeBuffer = Buffer.from(result.qrCodeBase64, 'base64');
                                    const pixEmbed = new EmbedBuilder()
                                .setTitle(`PIX - ${product.name}`)
                                .setDescription(`✅ Pague com o QR Code ou copie o código abaixo:\n\n\`\`\`\n${result.qrCode}\n\`\`\`\n\nExpira em 30 minutos.`)
                                        .setImage('attachment://qrcode.png')
                                        .setColor(0x00FF00);
                                    
                            await loadingMsg?.delete();
                            await (interaction.channel as any)?.send({ 
                                        embeds: [pixEmbed], 
                                        files: [{ attachment: qrCodeBuffer, name: 'qrcode.png' }]
                                    });
                                } else {
                            await loadingMsg?.edit({ 
                                embeds: [new EmbedBuilder()
                                    .setDescription(`❌ Erro: ${result.message}`)
                                    .setColor(0xFF0000)]
                            });
                        }
                    }
                    return;
                }

                // ===== PAGAMENTO: Cartão =====
                if (action === 'PAY_CARD') {
                    await interaction.deferUpdate();
                    
                    const [saleId, gateway] = params;
                    const salesCol = db.collection<Sale>('sales');
                    const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
                    if (!sale) return;

                    const productsCol = db.collection<Product>('products');
                    const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
                    if (!product) return;

                    // Se já tem link gerado, mostra novamente
                    if (sale.paymentDetails?.init_point) {
                        const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setLabel('Pagar Agora')
                                .setStyle(ButtonStyle.Link)
                                .setURL(sale.paymentDetails.init_point)
                        );

                        const paymentEmbed = new EmbedBuilder()
                            .setDescription('✅ Link de pagamento gerado! Clique no botão abaixo.')
                                .setColor(0x00FF00);
                            
                        await (interaction.channel as any)?.send({ embeds: [paymentEmbed], components: [linkRow] });
                        return;
                    }

                    const loadingEmbed = new EmbedBuilder()
                        .setDescription('⏳ Gerando link de pagamento...')
                        .setColor(0xFFAA00);
                    
                    const loadingMsg = await (interaction.channel as any)?.send({ embeds: [loadingEmbed] });

                    if (gateway === 'mercadopago') {
                        const result = await createMercadoPagoPreference(tenant, product, saleId, user._id.toString());
                        
                        if (result.success && result.init_point && result.preferenceId) {
                            await salesCol.updateOne(
                                { _id: new ObjectId(saleId) },
                                { 
                                    $set: { 
                                        "paymentDetails.init_point": result.init_point,
                                        "paymentDetails.preferenceId": result.preferenceId,
                                    }
                                }
                            );

                            const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                                new ButtonBuilder()
                                    .setLabel('Pagar Agora')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(result.init_point)
                            );

                            const paymentEmbed = new EmbedBuilder()
                                .setDescription('✅ Link de pagamento gerado! Clique no botão abaixo.')
                                .setColor(0x00FF00);

                            await loadingMsg?.delete();
                            await (interaction.channel as any)?.send({ embeds: [paymentEmbed], components: [linkRow] });
                        } else {
                            await loadingMsg?.edit({ 
                                embeds: [new EmbedBuilder()
                                    .setDescription(`❌ Erro: ${result.message}`)
                                    .setColor(0xFF0000)]
                                    });
                                }
                            }
                    return;
                }

                // Outros botões de fluxo opcional
                const botConfig = tenant.botConfig;
                if (botConfig?.flows) {
                    const allFlows = botConfig.flows;
                    const allSteps = allFlows.flatMap((flow: any) => flow.steps);
                    const targetStep = allSteps.find((s: BotStep) => s.id === params[0]);

                    if (action === 'GO_TO_STEP' && targetStep) {
                        await executeStep(interaction, targetStep);
                        return;
                    }
                }
            }

        } catch (error: any) {
            console.error('[Discord] Error handling interaction:', error);
            try {
                if (interaction.isRepliable() && !interaction.replied) {
                    await interaction.reply({ content: 'Ocorreu um erro.', ephemeral: true });
                }
            } catch (e) {
                console.error('[Discord] Failed to send error message:', e);
            }
        }
    });

    client.on('error', (error) => {
        console.error('[Discord] Client error:', error);
    });

    return client;
}

// ===== WEBHOOK HANDLER FOR PAYMENT CONFIRMATION =====

export async function handleDiscordPaymentConfirmation(saleId: string) {
    try {
        const dbClient = await clientPromise;
        const db = dbClient.db('vematize');
        
        const salesCol = db.collection<Sale>('sales');
        const sale = await salesCol.findOne({ _id: new ObjectId(saleId) });
        
        if (!sale || !sale.discordThreadId) {
            console.warn('[Discord] Sale or thread not found');
            return;
        }

        const tenantsCol = db.collection<Tenant>('tenants');
        const tenant = await tenantsCol.findOne({ _id: new ObjectId(sale.tenantId) });
        
        if (!tenant || !tenant.connections?.discord?.botToken || !tenant.connections?.discord?.clientId) {
            console.warn('[Discord] Tenant or Discord connection not found');
            return;
        }

        const productsCol = db.collection<Product>('products');
        const product = await productsCol.findOne({ _id: new ObjectId(sale.productId) });
        
        if (!product) {
            console.warn('[Discord] Product not found');
            return;
        }

        const usersCol = db.collection<User>('users');
        const user = await usersCol.findOne({ _id: new ObjectId(sale.userId) });
        
        if (!user) {
            console.warn('[Discord] User not found');
            return;
        }

        // Cria cliente temporário para entregar o produto
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ]
        });

        await client.login(tenant.connections.discord.botToken);

        try {
            const thread = await client.channels.fetch(sale.discordThreadId);
            if (thread && thread.isThread()) {
                await deliverProduct(client, db, sale, product, user, tenant, thread as ThreadChannel);
                
                // Atualiza status da venda
                await salesCol.updateOne(
                    { _id: sale._id },
                    { $set: { status: 'approved', updatedAt: new Date() } }
                );
            }
        } finally {
            await client.destroy();
        }

    } catch (error) {
        console.error('[Discord] Error in payment confirmation:', error);
    }
}
