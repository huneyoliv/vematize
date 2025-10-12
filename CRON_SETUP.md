# 🕐 Configuração do Cron Job de Limpeza de Sessões

## 📋 Descrição

O sistema possui um cron job automático que **remove sessões expiradas** do banco de dados todos os dias à meia-noite (00:00 UTC), evitando poluição no MongoDB.

---

## 🚀 Como Funciona

### Endpoint
```
GET /api/cron/cleanup-sessions
```

### Lógica
```javascript
sessionsCollection.deleteMany({
  expiresAt: { $lt: new Date() }
})
```

### Frequência
**Diariamente às 00:00 UTC** (configurado no `vercel.json`)

---

## ⚙️ Configuração no Vercel

### 1. Deploy no Vercel

O arquivo `vercel.json` já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 2. Adicionar Variável de Ambiente

No painel do Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - **Name**: `CRON_SECRET`
   - **Value**: (mesmo valor do `NEXTAUTH_SECRET` ou crie um novo)
   - **Environments**: Production, Preview, Development

### 3. Redeploy

Após adicionar a variável:
```bash
vercel --prod
```

---

## 🔒 Segurança

O endpoint exige autenticação via header:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

⚠️ **IMPORTANTE**: Sem o header correto, o endpoint retorna `401 Unauthorized`.

---

## 🧪 Testes

### Teste Local

1. Crie `.env.local` com:
   ```env
   CRON_SECRET=seu-secret-aqui
   ```

2. Execute:
   ```bash
   curl -X GET http://localhost:3000/api/cron/cleanup-sessions \
     -H "Authorization: Bearer seu-secret-aqui"
   ```

3. Resposta esperada:
   ```json
   {
     "success": true,
     "message": "Successfully removed 5 expired sessions",
     "deletedCount": 5,
     "timestamp": "2025-10-12T03:00:00.000Z"
   }
   ```

### Teste em Produção

O Vercel Cron executará automaticamente à meia-noite. Para ver os logs:

1. Acesse o painel do Vercel
2. Vá em **Deployments** → Selecione um deployment
3. Clique em **Functions** → Procure por `cleanup-sessions`
4. Veja os logs de execução

---

## 📊 Monitoramento

### Logs no MongoDB

Você pode verificar quantas sessões existem:

```javascript
db.sessions.countDocuments({ expiresAt: { $lt: new Date() } })
```

### Logs no Vercel

Verifique os logs do cron job no painel do Vercel:
- **Success**: `[Cron Cleanup] Removed X expired sessions`
- **Error**: `[Cron Cleanup] Error cleaning up sessions`

---

## ⏰ Cron Schedule Reference

O formato `"0 0 * * *"` significa:

```
┌───────────── minuto (0-59)
│ ┌─────────── hora (0-23)
│ │ ┌───────── dia do mês (1-31)
│ │ │ ┌─────── mês (1-12)
│ │ │ │ ┌───── dia da semana (0-6, 0 = domingo)
│ │ │ │ │
0 0 * * *
```

**Exemplos**:
- `0 0 * * *` - Todo dia à meia-noite (00:00)
- `0 */6 * * *` - A cada 6 horas
- `0 2 * * *` - Todo dia às 02:00
- `0 0 * * 0` - Todo domingo à meia-noite

---

## 🔄 Alternativa: Node-Cron (Local/Self-Hosted)

Se não estiver usando Vercel, você pode usar `node-cron`:

### Instalação
```bash
npm install node-cron
```

### Código
```typescript
// src/lib/cron.ts
import cron from 'node-cron';
import clientPromise from './mongodb';

export function startCronJobs() {
  // Executa todo dia à meia-noite
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Starting session cleanup...');
    
    try {
      const client = await clientPromise;
      const db = client.db('vematize');
      const result = await db.collection('sessions').deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`[Cron] Removed ${result.deletedCount} expired sessions`);
    } catch (error) {
      console.error('[Cron] Error:', error);
    }
  });
}
```

### Inicializar
```typescript
// src/app/layout.tsx (Server Component)
import { startCronJobs } from '@/lib/cron';

if (process.env.NODE_ENV === 'production') {
  startCronJobs();
}
```

---

## ✅ Checklist de Implementação

- [x] Criar endpoint `/api/cron/cleanup-sessions`
- [x] Configurar `vercel.json` com schedule
- [x] Documentar variável `CRON_SECRET`
- [ ] Adicionar `CRON_SECRET` no Vercel
- [ ] Deploy em produção
- [ ] Verificar logs após primeira execução

---

## 📚 Referências

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Crontab Guru](https://crontab.guru/) - Validador de expressões cron

