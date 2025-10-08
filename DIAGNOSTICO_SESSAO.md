# 🔍 Diagnóstico de Problemas de Sessão

## Problema Atual

```
Error: Forbidden at requireTenantAccess
```

Isso indica que a sessão não está correta. Vamos diagnosticar:

---

## 🧪 Passo 1: Verificar se o Tenant Existe

Abra o MongoDB Compass ou mongo shell:

```javascript
// Conecte ao banco vematize
use vematize

// Busque o tenant
db.tenants.findOne({ subdomain: "popular-teaching-falcon" })

// Se retornar null, o tenant não existe!
```

**Se não existir:**
```javascript
// Crie um tenant de teste
db.tenants.insertOne({
  subdomain: "popular-teaching-falcon",
  ownerName: "Teste",
  ownerEmail: "teste@email.com",
  passwordHash: "$2a$10$hash_aqui", // Use bcrypt
  subscriptionStatus: "trial",
  trialEndsAt: new Date(Date.now() + 30*24*60*60*1000),
  createdAt: new Date()
})
```

---

## 🧪 Passo 2: Verificar Sessão Atual

No navegador, abra DevTools (F12) → Application → Cookies:

```
Nome: session_token
Valor: [algum token longo]
HttpOnly: ✓
Secure: (se prod)
SameSite: Strict
```

**Se não houver cookie:**
- Fazer logout
- Limpar cookies
- Fazer login novamente

---

## 🧪 Passo 3: Verificar Sessão no Banco

```javascript
use vematize

// Liste todas as sessões
db.sessions.find().pretty()

// Busque sua sessão específica
db.sessions.findOne({ token: "cole_o_token_do_cookie_aqui" })
```

**Verifique se a sessão tem:**
```javascript
{
  token: "...",
  userId: "...",
  email: "teste@email.com",
  name: "Teste",
  subdomain: "popular-teaching-falcon", // ← ESTE CAMPO É CRÍTICO
  type: "tenant",
  createdAt: ISODate(...),
  expiresAt: ISODate(...)
}
```

**Se `subdomain` estiver faltando:**
```javascript
// Delete a sessão ruim
db.sessions.deleteOne({ token: "token_aqui" })

// Faça logout no navegador
// Limpe cookies
// Faça login novamente
```

---

## 🧪 Passo 4: Teste de Login Completo

### Teste com Admin:

```
1. Vá para http://localhost:3000/login
2. Digite:
   Email/Usuário: admin
   Senha: admin
3. Deve redirecionar para /krov/dashboard
4. Verifique no terminal do Next.js:
   ✓ Não deve ter erros "Forbidden"
```

### Teste com Tenant:

```
1. IMPORTANTE: Primeiro registre um novo tenant
   - Vá para /register
   - Preencha todos os campos
   - Subdomain: minha-loja (sem espaços, minúsculo)
   
2. Após registro, faça login:
   Email/Usuário: seu_email@exemplo.com
   Senha: sua_senha
   
3. Deve redirecionar para /minha-loja/dashboard
4. Verifique:
   ✓ URL tem /minha-loja/
   ✓ Sidebar do cliente aparece
   ✓ Produtos/Usuários/Bots carregam
```

---

## 🔧 Correções Aplicadas

✅ **Schema de Login** - Aceita email OU username
✅ **Logs de Debug** - `requireTenantAccess` agora loga erros detalhados
✅ **Validação de Subdomain** - Verifica se sessão tem subdomain

---

## 📊 Logs Úteis

Após fazer login, verifique no terminal do Next.js:

### ✅ Login Bem-Sucedido (Admin):
```
[Login] Admin login successful
→ Redirecting to /krov/dashboard
```

### ✅ Login Bem-Sucedido (Tenant):
```
[Login] Tenant login successful
→ Redirecting to /popular-teaching-falcon/dashboard
```

### ❌ Erro de Sessão:
```
[requireTenantAccess] No session found
```
**Solução:** Limpe cookies e faça login novamente

### ❌ Erro de Subdomain:
```
[requireTenantAccess] Tenant session without subdomain
```
**Solução:** Delete sessão do banco e faça login novamente

### ❌ Erro de Acesso:
```
[requireTenantAccess] Access denied: user@email.com tried to access other-subdomain but owns my-subdomain
```
**Solução:** Você está tentando acessar subdomain errado

---

## 🚨 Problemas Comuns

### 1. "Tenant not found" no API
```
GET /api/tenant-status/subdomain 404
```
**Causa:** Tenant não existe no banco
**Solução:** Registre via /register ou crie manualmente no banco

### 2. "Forbidden" em getCurrentPlanInfo
```
Database Error fetching current plan: Error: Forbidden
```
**Causa:** Sessão sem subdomain ou subdomain incorreto
**Solução:** 
```javascript
// Delete todas as sessões ruins
db.sessions.deleteMany({})
// Faça login novamente
```

### 3. Campos não aparecem (produtos, usuários, etc)
**Causa:** URL não tem `/subdomain/` correto
**Solução:** Verifique que está em `localhost:3000/{seu-subdomain}/products`

---

## 🔄 Reset Completo (Se nada funcionar)

```javascript
// MongoDB - Delete tudo e recomece
use vematize
db.sessions.deleteMany({})
db.tenants.deleteMany({}) // ⚠️ CUIDADO: Apaga todos os clientes

// Navegador
// 1. F12 → Application → Clear Storage → Clear site data
// 2. Feche e reabra o navegador
// 3. npm run dev (reinicie o servidor)
// 4. Registre novo tenant em /register
// 5. Faça login
```

---

## 📞 Ainda com Problemas?

1. Copie TODO o log do terminal
2. Copie TODO o log do DevTools Console
3. Tire print da URL atual
4. Mostre o resultado de:
```javascript
db.sessions.find().pretty()
db.tenants.find({ subdomain: "seu-subdomain" }).pretty()
```

---

**Última atualização:** 07/10/2025

