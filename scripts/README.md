# Scripts de Migração e Manutenção

## 🔄 Migração Subdomain → Username

### Script: `migrate-subdomain-to-username.js`

Este script migra automaticamente os tenants antigos que usavam apenas `subdomain` para o novo sistema baseado em `username`.

### O Que Faz

1. ✅ Busca todos os tenants sem campo `username`
2. ✅ Copia o valor de `subdomain` para `username`
3. ✅ Garante unicidade (adiciona sufixo `_1`, `_2`, etc. se necessário)
4. ✅ Gera username a partir do email para tenants sem subdomain
5. ✅ Verifica e reporta duplicatas
6. ✅ Mostra estatísticas completas

### Pré-requisitos

```bash
# 1. Instalar dependências
npm install mongodb dotenv

# 2. Configurar .env.local com MONGODB_URI
echo "MONGODB_URI=mongodb://..." > .env.local

# 3. FAZER BACKUP DO BANCO! (IMPORTANTE)
mongodump --uri="sua_uri" --out=backup_$(date +%Y%m%d_%H%M%S)
```

### Como Executar

```bash
# Modo seguro: Ver o que será migrado (dry-run)
node scripts/migrate-subdomain-to-username.js

# O script SEMPRE executa a migração real
# Certifique-se de ter feito backup!
```

### Saída Esperada

```
🔄 Iniciando migração: subdomain → username

✅ Conectado ao MongoDB

📊 ESTATÍSTICAS ANTES DA MIGRAÇÃO:
   Total de tenants: 15
   Sem username: 10
   Sem subdomain: 0

🔧 Migrando 10 tenants...

   ✓ user@example.com → username: oldsubdomain
   ✓ another@example.com → username: testsite_1
   ✓ test@example.com → username: myshop

📊 ESTATÍSTICAS APÓS MIGRAÇÃO:
   ✅ Migrados com sucesso: 10
   ❌ Erros: 0
   📝 Sem username (restantes): 0

✅ Nenhum username duplicado encontrado!

✅ Migração concluída!

🔌 Conexão com MongoDB fechada.
```

### Em Caso de Erro

Se o script falhar:

1. **Restaurar backup**:
   ```bash
   mongorestore --uri="sua_uri" --drop backup_YYYYMMDD_HHMMSS/
   ```

2. **Verificar logs**: O script mostra detalhes de cada erro
3. **Corrigir problema**: Ajustar dados manualmente se necessário
4. **Re-executar**: O script é idempotente (pode rodar múltiplas vezes)

### Casos Especiais

#### Tenant sem subdomain nem username
```javascript
// Script gera username a partir do email
user@example.com → username: user
admin@site.com → username: admin
```

#### Username duplicado
```javascript
// Script adiciona sufixo automaticamente
subdomain: "shop" → username: "shop"
subdomain: "shop" → username: "shop_1"
subdomain: "shop" → username: "shop_2"
```

### Verificação Manual Pós-Migração

```bash
# Conectar ao MongoDB
mongosh "sua_uri"

# Verificar tenants sem username
db.tenants.countDocuments({ username: { $exists: false } })
// Deve retornar: 0

# Verificar duplicatas
db.tenants.aggregate([
  { $group: { _id: "$username", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
// Deve retornar: array vazio []

# Listar alguns registros migrados
db.tenants.find({}, { username: 1, subdomain: 1, ownerEmail: 1 }).limit(5)
```

### Rollback

Se precisar reverter:

```bash
# Restaurar backup completo
mongorestore --uri="sua_uri" --drop backup_YYYYMMDD_HHMMSS/

# OU remover campo username manualmente
mongosh "sua_uri"
db.tenants.updateMany({}, { $unset: { username: "" } })
```

---

## 📊 Compatibilidade

O código da aplicação foi desenvolvido para funcionar **COM OU SEM** o script de migração:

- ✅ Tenants antigos (só subdomain) → Funciona
- ✅ Tenants novos (username) → Funciona
- ✅ Tenants migrados (ambos) → Funciona

Portanto, a migração pode ser executada **a qualquer momento**, sem downtime da aplicação.

---

## 🔧 Manutenção

### Adicionar Novo Script

1. Criar arquivo em `scripts/nome-do-script.js`
2. Seguir o mesmo padrão de estrutura
3. Documentar neste README
4. Adicionar em `.gitignore` se necessário

### Boas Práticas

- ✅ SEMPRE fazer backup antes de migrations
- ✅ Testar em staging primeiro
- ✅ Usar transactions quando possível
- ✅ Fazer scripts idempotentes
- ✅ Logar detalhadamente
- ✅ Verificar resultados após execução

---

**Última atualização**: 07/10/2025  
**Autor**: Sistema de Migração Vematize

