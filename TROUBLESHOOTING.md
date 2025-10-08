# 🔧 Troubleshooting - Vematize

## Problemas Comuns e Soluções

---

### ❌ Erro: "Cannot find module './vendor-chunks/tslib.js'"

**Sintomas**:
```
⨯ Error: Cannot find module './vendor-chunks/tslib.js'
```

**Causa**: Cache corrompido do Next.js (pasta `.next`)

**Solução**:
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run dev

# Linux/Mac
rm -rf .next
npm run dev
```

---

### ❌ Erro: "GET /api/tenant-status/[subdomain] 404"

**Sintomas**:
```
GET /api/tenant-status/popular-teaching-falcon 404 in 11718ms
[Middleware] A verificação de status do tenant falhou com status 404
```

**Causa**: Rota API não encontrada ou tenant não existe no banco

**Solução**:
1. Verificar se a rota existe:
   ```bash
   ls src/app/api/tenant-status/
   ```

2. Verificar se tenant existe no MongoDB:
   ```javascript
   db.tenants.findOne({ 
     $or: [
       { username: "popular-teaching-falcon" },
       { subdomain: "popular-teaching-falcon" }
     ]
   })
   ```

3. Se não existe, criar ou fazer login com tenant existente

---

### ❌ Erro de Compilação TypeScript

**Sintomas**:
```
Type error: Property 'X' does not exist on type 'Y'
```

**Solução**:
```bash
# 1. Limpar tudo
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules

# 2. Reinstalar
npm install

# 3. Verificar tipos
npm run typecheck

# 4. Iniciar
npm run dev
```

---

### ❌ "Unauthorized" ou "Forbidden" ao Acessar Páginas

**Sintomas**:
```
Database Error: Unauthorized
Database Error: Forbidden
```

**Causa**: Sessão expirada ou tentando acessar recurso de outro usuário

**Solução**:
1. **Limpar cookies do navegador**
2. **Fazer logout e login novamente**
3. **Verificar se está tentando acessar o subdomain correto**

```bash
# Verificar sessões ativas
mongosh "mongodb://sua_uri"
db.sessions.find({ expiresAt: { $gt: new Date() } })

# Limpar sessões expiradas
db.sessions.deleteMany({ expiresAt: { $lt: new Date() } })
```

---

### ❌ Login Não Funciona

**Sintomas**:
- "Username ou senha inválidos"
- Redireciona de volta para login

**Soluções**:

#### 1. Verificar Credenciais no Banco
```javascript
// Admin
db.admins.findOne({ username: "admin" })

// Tenant
db.tenants.findOne({ 
  $or: [
    { username: "seu_username" },
    { subdomain: "seu_username" }
  ]
})
```

#### 2. Verificar Hash de Senha
```javascript
// Testar se senha está correta
const bcrypt = require('bcryptjs');
const tenant = db.tenants.findOne({ username: "teste" });
bcrypt.compareSync("sua_senha", tenant.passwordHash); // deve retornar true
```

#### 3. Criar Admin Inicial
Se não existe admin, será criado automaticamente no primeiro acesso com:
- Username: `admin`
- Password: `admin`

**⚠️ IMPORTANTE**: Trocar esta senha imediatamente após primeiro acesso!

---

### ❌ Banco de Dados Não Conecta

**Sintomas**:
```
MongoError: connection timeout
Critical warning: MONGODB_URI environment variable missing
```

**Solução**:

1. **Verificar `.env.local`**:
   ```bash
   cat .env.local
   # Deve conter:
   # MONGODB_URI=mongodb://...
   ```

2. **Criar `.env.local` se não existir**:
   ```bash
   echo "MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/vematize" > .env.local
   ```

3. **Testar conexão**:
   ```javascript
   mongosh "sua_uri"
   ```

---

### ❌ Migração de Username Falha

**Sintomas**:
```
❌ Migrado com sucesso: 0
⚠️ Usernames duplicados encontrados
```

**Solução**:

1. **Restaurar backup**:
   ```bash
   mongorestore --uri="mongodb://uri" --drop backup_YYYYMMDD/
   ```

2. **Corrigir manualmente duplicatas**:
   ```javascript
   // Ver duplicatas
   db.tenants.aggregate([
     { $group: { _id: "$subdomain", count: { $sum: 1 } } },
     { $match: { count: { $gt: 1 } } }
   ])
   
   // Renomear duplicatas
   db.tenants.updateOne(
     { subdomain: "duplicado", _id: ObjectId("...") },
     { $set: { subdomain: "duplicado_2" } }
   )
   ```

3. **Re-executar migração**:
   ```bash
   npm run migrate:username
   ```

---

### ❌ Página em Branco ou Erro 500

**Sintomas**:
- Página não carrega
- `GET /dashboard 500`

**Solução**:

1. **Ver logs do servidor**:
   ```bash
   # Está rodando npm run dev?
   # Ver output completo no terminal
   ```

2. **Limpar cache**:
   ```bash
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

3. **Verificar console do navegador** (F12):
   - Ver erros JavaScript
   - Ver falhas de requisições

---

### ❌ Webhook Não Funciona

**Sintomas**:
- Pagamentos não são processados
- Webhook retorna 404 ou 500

**Solução**:

1. **Verificar URL do webhook**:
   ```
   # Krov (subscriptions):
   https://seu-dominio.com/krov/api/webhook/mercadopago
   
   # Tenant (products):
   https://seu-dominio.com/[username]/api/webhook/mercadopago
   ```

2. **Verificar logs**:
   ```bash
   # Ver logs do servidor
   # Procurar por "[Webhook]"
   ```

3. **Testar manualmente**:
   ```bash
   curl -X POST https://seu-dominio.com/api/webhook/mercadopago \
     -H "Content-Type: application/json" \
     -d '{"type": "payment", "data": {"id": "123"}}'
   ```

---

### ❌ CORS / Cross-Origin Errors

**Sintomas**:
```
⚠ Cross origin request detected
```

**Solução temporária** (desenvolvimento):

Editar `next.config.mjs`:
```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
```

**⚠️ NÃO usar em produção!**

---

### ❌ Build Falha

**Sintomas**:
```
npm run build
Failed to compile
```

**Solução**:

1. **Ver erro específico**:
   ```bash
   npm run build 2>&1 | more
   ```

2. **Verificar tipos**:
   ```bash
   npm run typecheck
   ```

3. **Limpar e rebuildar**:
   ```bash
   Remove-Item -Recurse -Force .next
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run build
   ```

---

## 🆘 Ainda com Problemas?

### 1. Verificar Logs Completos
```bash
npm run dev > logs.txt 2>&1
# Abrir logs.txt e procurar por "Error"
```

### 2. Verificar Versões
```bash
node --version  # Deve ser v18+
npm --version   # Deve ser v9+
```

### 3. Reinstalar do Zero
```bash
# Backup do código
git status
git commit -am "backup antes de reinstalar"

# Limpar tudo
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
Remove-Item package-lock.json

# Reinstalar
npm install
npm run dev
```

### 4. Verificar Memória
```bash
# Windows
tasklist | findstr node

# Se node.exe está usando >2GB, reiniciar:
taskkill /F /IM node.exe
npm run dev
```

---

## 📚 Documentação Adicional

- **Sistema Username**: Ver `SISTEMA_USERNAME_COMPLETO.md`
- **Como Usar**: Ver `COMO_USAR.md`
- **Migração**: Ver `MIGRATION_GUIDE.md`
- **Webhooks**: Ver `WEBHOOK_ARCHITECTURE.md`
- **Segurança**: Ver `CORRECOES_IDOR_RESUMO.md`

---

## 🐛 Reportar Bug

Se nenhuma solução funcionou:

1. Documentar o erro:
   - Mensagem de erro completa
   - Passos para reproduzir
   - Versão do Node.js e npm
   - Sistema operacional

2. Verificar se já existe issue similar

3. Criar novo issue com template

---

**Última atualização**: 07/10/2025  
**Versão**: 2.0.0

