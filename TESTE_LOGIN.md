# 🧪 TESTE DE LOGIN - Passo a Passo

## 📋 **Instruções Completas:**

### 1️⃣ **Limpar Completamente o Cache**

1. **Pressione**: `Ctrl + Shift + Delete`
2. **Selecione**:
   - ✅ Cookies e dados de sites
   - ✅ Cache de imagens e arquivos
3. **Intervalo**: "Todas as horas" ou "Todo o período"
4. **Clique**: "Limpar dados"

### 2️⃣ **Fazer Logout Completo**

1. Acesse: `http://localhost:3000/logout`
2. Aguarde a página de confirmação
3. **Feche TODAS as abas** do localhost
4. **Feche o navegador completamente**

### 3️⃣ **Abrir em Nova Janela Anônima** (Recomendado)

1. **Pressione**: `Ctrl + Shift + N` (Chrome/Edge) ou `Ctrl + Shift + P` (Firefox)
2. Acesse: `http://localhost:3000/login`

### 4️⃣ **Fazer Login**

1. **Email**: `socloud476@gmail.com`
2. **Senha**: [sua senha]
3. **Clique**: "Entrar"

### 5️⃣ **Verificar URL**

Após login, a URL deve ser:
- ✅ **CORRETO**: `http://localhost:3000/dashboard`
- ❌ **ERRADO**: `http://localhost:3000/krov/dashboard`

---

## 🔍 **Verificações:**

### ✅ **Deve aparecer:**
- Sidebar à esquerda com: Dashboard, Meus Bots, Produtos, Usuários, Meu Plano, Configurações
- Estatísticas no dashboard: Receita Total, Vendas Realizadas, Total de Usuários

### ❌ **NÃO deve aparecer:**
- Opções de admin: Clientes, Cupons, Relatórios
- URL com `/krov/`

---

## 🐛 **Se ainda aparecer `/krov/dashboard`:**

Me envie o seguinte:
1. A URL completa da barra de endereços
2. Print da tela (se possível)
3. Os últimos logs do terminal após fazer login

---

## 📊 **Verificação do Banco de Dados:**

Para confirmar que a sessão foi criada corretamente, me envie o resultado de:

```bash
# No terminal, após fazer login:
mongo
use vematize
db.sessions.findOne({}, {sort: {createdAt: -1}})
```

Isso mostrará a sessão mais recente e seu tipo (`admin` ou `tenant`).

