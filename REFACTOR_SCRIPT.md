# Script de Refatoração: Remover Subdomain das Rotas

## Padrão de Refatoração

Para cada arquivo em `src/app/tenant/**/actions.ts`:

### 1. Atualizar imports
```typescript
// ANTES
import { requireTenantAccess } from '@/lib/auth';

// DEPOIS
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';
```

### 2. Remover parâmetro `subdomain`
```typescript
// ANTES
export async function someAction(subdomain: string, ...otherParams) {

// DEPOIS
export async function someAction(...otherParams) {
```

### 3. Buscar tenant da sessão
```typescript
// ANTES
await requireTenantAccess(subdomain);
const tenant = await db.collection('tenants').findOne({ $or: [{ username: subdomain }, { subdomain }] });

// DEPOIS
const tenant = await getTenantFromSession();
```

### 4. Atualizar páginas
```typescript
// ANTES
export default async function Page({ params }: { params: { subdomain: string } }) {
  await requireTenantAccess(params.subdomain);
  const data = await someAction(params.subdomain);

// DEPOIS
export default async function Page() {
  await getTenantFromSession(); // Valida sessão
  const data = await someAction();
```

## Arquivos a Refatorar

- [x] src/app/tenant/dashboard/actions.ts
- [x] src/app/tenant/dashboard/page.tsx
- [x] src/app/tenant/users/actions.ts
- [ ] src/app/tenant/users/page.tsx
- [ ] src/app/tenant/products/actions.ts (múltiplas funções)
- [ ] src/app/tenant/products/page.tsx
- [ ] src/app/tenant/bots/actions.ts (múltiplas funções)
- [ ] src/app/tenant/bots/page.tsx
- [ ] src/app/tenant/bots/[platform]/page.tsx
- [ ] src/app/tenant/plan/actions.ts (múltiplas funções)
- [ ] src/app/tenant/plan/page.tsx
- [ ] src/app/tenant/settings/actions.ts
- [ ] src/app/tenant/settings/page.tsx
- [ ] src/app/tenant/layout.tsx

## Webhooks (Manter Username)

O webhook deve continuar recebendo o username na URL:
```
/api/webhook/{gateway}/{username}
```

Exemplo: `/api/webhook/mercadopago/swaptune`

