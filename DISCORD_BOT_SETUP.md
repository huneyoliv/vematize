# 🤖 Guia de Configuração do Bot Discord

Este guia mostrará como criar e conectar um bot Discord ao sistema Vematize.

## 📋 Pré-requisitos

- Uma conta Discord
- Permissões de administrador no servidor Discord onde você deseja usar o bot

## 🚀 Passo 1: Criar o Aplicativo Discord

1. Acesse o [Portal de Desenvolvedores do Discord](https://discord.com/developers/applications)
2. Clique em **"New Application"** (Nova Aplicação)
3. Dê um nome ao seu aplicativo (ex: "Vematize Bot")
4. Aceite os Termos de Serviço
5. Clique em **"Create"**

## 🤖 Passo 2: Criar o Bot

1. No menu lateral esquerdo, clique em **"Bot"**
2. Clique em **"Add Bot"** (Adicionar Bot)
3. Confirme clicando em **"Yes, do it!"**

### ⚙️ Configurações Importantes do Bot

1. **Privileged Gateway Intents** - Ative as seguintes opções:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**

2. **Token do Bot**:
   - Clique em **"Reset Token"** (ou "Copy" se for a primeira vez)
   - **⚠️ IMPORTANTE**: Copie e guarde este token em um lugar seguro
   - **NUNCA compartilhe este token publicamente**
   - Este token parece com: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx`
   
   > **📝 NOTA**: Você **NÃO precisa** do Client ID ou Client Secret para conectar o bot!
   > Esses são usados apenas para OAuth2 (login de usuários). Para o bot funcionar, você só precisa do **Bot Token**.

## 🔗 Passo 3: Configurar Permissões

1. No menu lateral, clique em **"OAuth2"** → **"URL Generator"**

2. Em **SCOPES**, selecione:
   - ✅ `bot`
   - ✅ `applications.commands`

3. Em **BOT PERMISSIONS**, selecione:
   - ✅ **Manage Channels** (Gerenciar Canais)
   - ✅ **Manage Roles** (Gerenciar Cargos)
   - ✅ **Create Public Threads** (Criar Threads Públicas)
   - ✅ **Create Private Threads** (Criar Threads Privadas)
   - ✅ **Send Messages in Threads** (Enviar Mensagens em Threads)
   - ✅ **Manage Messages** (Gerenciar Mensagens)
   - ✅ **Manage Threads** (Gerenciar Threads)
   - ✅ **Embed Links** (Incorporar Links)
   - ✅ **Attach Files** (Anexar Arquivos)
   - ✅ **Read Message History** (Ler Histórico de Mensagens)
   - ✅ **Add Reactions** (Adicionar Reações)
   - ✅ **Use Slash Commands** (Usar Comandos Slash)
   - ✅ **Send Messages** (Enviar Mensagens)
   - ✅ **View Channels** (Ver Canais)

4. Copie a **URL gerada** no final da página

## 🏠 Passo 4: Adicionar o Bot ao Servidor

1. Cole a URL gerada no navegador
2. Selecione o servidor Discord onde deseja adicionar o bot
3. Clique em **"Autorizar"**
4. Complete o captcha, se solicitado

## 🔧 Passo 5: Obter IDs Necessários

### Habilitar o Modo Desenvolvedor

1. No Discord, vá em **Configurações do Usuário** (engrenagem)
2. Vá em **Avançado** → **Configurações Avançadas**
3. Ative **"Modo Desenvolvedor"**

### Obter IDs

Agora você pode clicar com o botão direito em canais, cargos e categorias e selecionar **"Copiar ID"**:

- **ID do Servidor (Guild ID)**: Clique com o botão direito no nome do servidor → Copiar ID
- **ID do Canal**: Clique com o botão direito no canal → Copiar ID
- **ID do Cargo**: Configurações do Servidor → Cargos → Clique com o botão direito no cargo → Copiar ID
- **ID da Categoria**: Clique com o botão direito na categoria → Copiar ID

## 🎯 Passo 6: Configurar no Sistema Vematize

### 1. Acessar a Página de Bots

1. Faça login no painel Vematize
2. Vá em **"Bots"** no menu lateral
3. Clique no card **"Discord"**

### 2. Aba "Conexão"

1. Cole o **Token do Bot** que você copiou no Passo 2
2. Clique em **"Salvar Configuração"**
3. Aguarde a confirmação de conexão

### 3. Aba "Configurações"

Configure as seguintes opções:

**Tipo de Entrega:**
- **Automática**: O bot entrega o produto automaticamente após confirmação do pagamento
- **Manual com Cargo**: Adiciona membros com um cargo específico ao chat do carrinho
- **Manual com Notificação**: Notifica um cargo específico sobre a venda

**Campos a Preencher:**

- **ID do Cargo de Entrega** (se escolheu "Manual com Cargo"):
  - ID do cargo que será adicionado ao thread para entrega manual
  
- **ID do Cargo para Notificar** (se escolheu "Manual com Notificação"):
  - ID do cargo que será notificado sobre novas vendas
  
- **ID da Categoria do Carrinho**:
  - ID da categoria onde os threads de carrinho serão criados
  - Exemplo: Crie uma categoria "🛒 Carrinhos" e copie o ID dela
  
- **ID do Canal de Logs de Vendas**:
  - ID do canal onde os logs de vendas serão enviados
  - Exemplo: Crie um canal "📊-logs-vendas" e copie o ID dele
  
- **Mensagem de Entrega Automática** (opcional):
  - Mensagem personalizada enviada junto com a entrega automática

### 4. Aba "Painéis de Vendas"

1. Clique em **"+ Adicionar Painel"**
2. Preencha os campos:
   - **Nome do Painel**: Nome interno para identificação
   - **ID do Canal**: Canal onde a mensagem de vendas será enviada
   - **Produtos**: Selecione os produtos que aparecerão neste painel

3. **Configurar Embed**:
   - **Título**: Título da mensagem (ex: "🛍️ Produtos Disponíveis")
   - **Descrição**: Descrição do painel (ex: "Clique no botão abaixo para comprar!")
   - **Cor**: Cor do embed em hexadecimal (ex: #5865F2)
   - **URL da Imagem**: URL de uma imagem (opcional)
   - **URL da Thumbnail**: URL de uma thumbnail (opcional)

4. Clique em **"Salvar Todos os Painéis"**
5. O bot enviará automaticamente as mensagens nos canais configurados

## 📝 Estrutura Recomendada do Servidor

```
📁 LOJA
  ├─ 📢 anúncios
  ├─ 📋 regras
  └─ 🛍️ produtos
  
📁 🛒 CARRINHOS (categoria para threads de carrinho)
  └─ (threads criados automaticamente)
  
📁 📊 ADMINISTRAÇÃO
  ├─ 📊 logs-vendas
  └─ 🔧 comandos-bot
```

## ✅ Teste a Configuração

1. Vá até um canal onde você publicou um painel de vendas
2. Clique no botão **"🛒 Comprar"** abaixo de um produto
3. Um thread privado será criado com você e o bot
4. Você verá o carrinho com as opções:
   - ✏️ Editar Quantidade
   - 🎫 Aplicar Cupom
   - 💳 Finalizar Compra
   - ❌ Cancelar

## 🔍 Solução de Problemas

### O bot não está respondendo

- ✅ Verifique se o bot está online no servidor
- ✅ Confirme que o token está correto
- ✅ Verifique se os Privileged Gateway Intents estão ativos
- ✅ Verifique se o bot tem as permissões necessárias

### Não consigo ver os botões

- ✅ Atualize o Discord
- ✅ Verifique se o painel foi publicado corretamente
- ✅ Tente republicar o painel

### O bot não cria threads

- ✅ Verifique se a categoria existe e o ID está correto
- ✅ Confirme que o bot tem permissão para criar threads
- ✅ Verifique se a categoria não está cheia (limite de 50 threads ativos)

### Entrega manual não funciona

- ✅ Verifique se o ID do cargo está correto
- ✅ Confirme que o cargo existe no servidor
- ✅ Verifique se há membros com esse cargo

## 🎨 Personalização

### Cores de Embed

Algumas cores sugeridas:
- Discord Blurple: `#5865F2`
- Verde Sucesso: `#00FF00`
- Vermelho Erro: `#FF0000`
- Amarelo Aviso: `#FFAA00`
- Roxo: `#9B59B6`

### Emojis Personalizados

Você pode usar emojis personalizados do seu servidor nos textos dos embeds usando o formato:
```
<:nome_emoji:ID_DO_EMOJI>
```

## 📞 Suporte

Se você encontrar problemas, verifique:
1. Os logs do console (F12 no navegador)
2. Os logs do servidor Discord
3. As configurações do bot no Portal de Desenvolvedores

---

**🎉 Pronto! Seu bot Discord está configurado e pronto para vender!**

