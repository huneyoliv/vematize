# 🔄 Guia de Migração: Subdomain → Username

## 📋 Mudanças Implementadas

### ✅ Completado

1. **Schema de Dados**
   - `Tenant.username`: Campo obrigatório (identificador único)
   - `Tenant.subdomain`: Campo opcional (compatibilidade)
   - `Tenant.passwordResetToken`: Para recuperação de senha
   - `Tenant.passwordResetExpires`: Expiração do token

2. **Autenticação**
   - Login via username (não mais email)
   - Registro com username único
   - Validação em tempo real de disponibilidade
   - Sistema completo de recuperação de senha

3. **Sessões**
   - `SessionData.username`: Armazenado na sessão
   - `SessionData.subdomain`: Mantido para compatibilidade
   - `requireTenantAccess()`: Aceita username ou subdomain

4. **APIs**
   - `GET /api/check-username`: Validação de disponibilidade
   - Recuperação de senha: `/forgot-password` e `/reset-password`

---

## 🗄️ Migração de Dados Existentes

### Script de Migração MongoDB

```javascript
// Executar no MongoDB Shell ou via script Node.js

db.tenants.find({ username: { $exists: false } }).forEach(function(tenant) {
  // Gera username a partir do subdomain
  let username = tenant.subdomain;
  
  // Se username já existe, adiciona sufixo
  let suffix = 1;
  while(db.tenants.findOne({ username: username })) {
    username = tenant.subdomain + '_' + suffix;
    suffix++;
  }
  
  // Atualiza documento
  db.tenants.updateOne(
    { _id: tenant._id },
    { $set: { username: username } }
  );
  
  print('Migrado tenant:', tenant.ownerEmail, '→ username:', username);
});

print('\n✅ Migração concluída!');
print('Total de tenants:', db.tenants.countDocuments());
print('Com username:', db.tenants.countDocuments({ username: { $exists: true } }));
```

### Como Executar

```bash
# 1. Backup do banco
mongodump --uri="mongodb://..." --out=backup_$(date +%Y%m%d)

# 2. Executar script de migração
mongosh "mongodb://..." < migration_script.js

# 3. Verificar resultados
mongosh "mongodb://..." --eval "db.tenants.find({username: {\$exists: false}}).count()"
```

---

## 🔧 Compatibilidade

### Código Atual

O sistema foi desenvolvido com **compatibilidade retroativa**:

```typescript
// ✅ Ambos funcionam
requireTenantAccess('username123')      // Novo formato
requireTenantAccess('subdomain-antigo') // Formato antigo

// Session contém ambos
session.username  // 'username123' (novo)
session.subdomain // 'subdomain-antigo' (compatibilidade)
```

### Rotas

As rotas continuam usando `[subdomain]` no path, mas aceitam username:

```
/[subdomain]/dashboard → funciona com username ou subdomain
/username123/dashboard → ✓ Funciona
/subdomain-antigo/dashboard → ✓ Também funciona
```

---

## 📝 Checklist de Migração

### Antes de Migrar

- [ ] Fazer backup completo do MongoDB
- [ ] Testar script de migração em ambiente de staging
- [ ] Verificar se todos os tenants têm `subdomain` válido
- [ ] Notificar usuários sobre mudança (email)

### Durante Migração

- [ ] Executar script de migração
- [ ] Verificar logs de erros
- [ ] Confirmar que todos os tenants têm `username`
- [ ] Testar login com alguns usuários

### Após Migração

- [ ] Verificar que login funciona
- [ ] Testar registro de novo usuário
- [ ] Testar recuperação de senha
- [ ] Monitorar logs por 24h
- [ ] Comunicar aos usuários o novo formato

---

## 🎯 Próximos Passos (Opcional)

### Fase 2: Renomear Rotas

Após migração estabilizada, pode-se renomear rotas:

```bash
# Renomear diretórios
mv src/app/[subdomain] src/app/[username]

# Atualizar imports
# Buscar e substituir '[subdomain]' → '[username]'
```

### Fase 3: Remover Compatibilidade

Após alguns meses, pode-se remover suporte a subdomain:

```typescript
// Remover
if (session.subdomain) { ... }

// Usar apenas
if (session.username) { ... }
```

---

## 🔒 Segurança

### O que Foi Mantido

✅ Todas as validações de segurança IDOR  
✅ `requireTenantAccess()` continua validando ownership  
✅ Cookies httpOnly, secure, sameSite  
✅ Sessões server-side com expiração  
✅ Rate limiting nos webhooks  

### Melhorias Adicionadas

✅ Recuperação de senha segura (token com expiração)  
✅ Validação de formato de username (regex)  
✅ Verificação em tempo real de disponibilidade  
✅ Proteção contra enumeração de usuários  

---

## 📞 Suporte

### Problemas Comuns

**1. Login não funciona após migração**
- Verificar se `username` foi criado corretamente no banco
- Limpar cookies do navegador
- Verificar logs do servidor

**2. Username duplicado**
- Script adiciona sufixo automático (_1, _2, etc.)
- Usuários podem alterar no painel (futuro)

**3. Subdomain antigo não funciona**
- Sistema mantém compatibilidade
- Se não funcionar, verificar se `subdomain` existe no banco

---

## 📊 Monitoramento

### Métricas para Acompanhar

```javascript
// Tenants sem username
db.tenants.countDocuments({ username: { $exists: false } })

// Tenants com username
db.tenants.countDocuments({ username: { $exists: true } })

// Usernames duplicados (não deveria ter)
db.tenants.aggregate([
  { $group: { _id: "$username", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

**Última atualização**: 07/10/2025  
**Status**: ✅ Código pronto para migração  
**Próximo passo**: Executar script de migração em staging

