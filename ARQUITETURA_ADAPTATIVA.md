# 🎯 Arquitetura Adaptativa - Sistema Unificado

## Visão Geral

O sistema agora possui uma **arquitetura adaptativa** que detecta automaticamente o tipo de usuário e renderiza a interface apropriada, eliminando a necessidade de páginas e layouts separados.

---

## 🔄 Fluxo de Autenticação Unificado

```
┌─────────────────────────────────────────────────────────┐
│                    /login (ÚNICO)                        │
│                                                          │
│  Email/Usuário: [_________________]                      │
│  Senha:        [_________________]                       │
│                [ Entrar ]                                │
└──────────────────────┬───────────────────────────────────┘
                       ↓
              unifiedLogin()
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
   🔍 Admin?                      🔍 Tenant?
   (username/email)               (email)
        ↓                             ↓
   ✅ session.type='admin'       ✅ session.type='tenant'
        ↓                             ↓
   Redireciona para           Redireciona para
   /dashboard                 /dashboard
        ↓                             ↓
        └──────────────┬──────────────┘
                       ↓
              /dashboard (Universal)
                       ↓
           Detecta session.type
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
   /krov/dashboard             /{subdomain}/dashboard
   (Interface Admin)           (Interface Cliente)
```

---

## 🏗️ Estrutura de Arquivos

### ✅ Login Unificado
```
src/app/(auth)/login/
├── page.tsx          # Formulário único para todos
└── actions.ts        # unifiedLogin() - detecta tipo
```

### ✅ Dashboard Adaptativo
```
src/app/dashboard/
├── layout.tsx        # Redireciona baseado em session.type
└── page.tsx          # Página de redirecionamento inteligente
```

### ✅ Layouts Específicos (mantidos para features específicas)
```
src/app/krov/
└── layout.tsx        # Layout admin (Krov)

src/app/[subdomain]/
└── layout.tsx        # Layout tenant (Cliente)
```

### ✅ Componente Adaptativo (futuro)
```
src/components/layout/
└── adaptive-dashboard-layout.tsx  # Layout universal reutilizável
```

---

## 🎨 Interface Adaptativa

### Admin (Krov)
```typescript
session = {
  type: 'admin',
  email: 'admin@vematize.com',
  name: 'Administrador'
}
```

**Interface renderizada:**
- ✅ Sidebar do Krov
- ✅ Menu: Dashboard, Clientes, Planos, Cupons, Configurações
- ✅ Acesso global a todos os tenants
- ✅ Features administrativas

### Tenant (Cliente)
```typescript
session = {
  type: 'tenant',
  email: 'cliente@email.com',
  name: 'João Silva',
  subdomain: 'loja-exemplo'
}
```

**Interface renderizada:**
- ✅ Sidebar do Cliente
- ✅ Menu: Dashboard, Produtos, Vendas, Usuários, Bots, Configurações
- ✅ Acesso restrito ao próprio subdomain
- ✅ Alertas de assinatura
- ✅ Features de e-commerce

---

## 🔐 Segurança por Camadas

### Camada 1: Middleware (Edge)
```typescript
// src/middleware.ts
- Verifica cookie session_token
- Redireciona para /login se não autenticado
- Validação básica (não acessa DB)
```

### Camada 2: Layouts (Server Components)
```typescript
// src/app/dashboard/layout.tsx
- Obtém session via getCurrentSession()
- Valida session.type
- Redireciona para dashboard específico
```

### Camada 3: Server Actions
```typescript
// Todas as actions
- requireTenantAccess(subdomain)
- requireAdminAuth()
- Valida ownership antes de operações
```

### Camada 4: Database Queries
```typescript
// Filtragem por tenantId
db.collection('products').find({ 
  tenantId: tenant._id.toString() 
})
```

---

## 📊 Fluxo de Dados

### 1. Login
```typescript
POST /login
  ↓
unifiedLogin({ email, password })
  ↓
Busca em 'admins' collection → Encontrado? → Admin
  ↓ (não)
Busca em 'tenants' collection → Encontrado? → Tenant
  ↓
Cria sessão com type='admin' ou 'tenant'
  ↓
Set cookie session_token (httpOnly, secure, sameSite)
  ↓
Redireciona para /dashboard
```

### 2. Acesso à Página
```typescript
GET /dashboard
  ↓
Layout detecta session.type
  ↓ (se admin)
redirect('/krov/dashboard')
  ↓ (se tenant)
redirect('/{subdomain}/dashboard')
  ↓
Renderiza interface apropriada
```

### 3. Server Action
```typescript
getProducts(subdomain)
  ↓
requireTenantAccess(subdomain)
  ↓
getCurrentSession() → session
  ↓
Valida: session.subdomain === subdomain || session.type === 'admin'
  ↓ (aprovado)
Query: { tenantId: tenant._id }
  ↓
Retorna apenas produtos do tenant autorizado
```

---

## 🎯 Vantagens da Arquitetura

### ✅ UX Simplificada
- **1 página de login** ao invés de 2
- **Detecção automática** do tipo de usuário
- **Redirecionamento inteligente** para painel correto
- **Interface adaptativa** sem confusão

### ✅ Segurança Reforçada
- **Validação em múltiplas camadas**
- **Proteção IDOR** em todas as actions
- **Admin tem acesso global** (necessário para gestão)
- **Tenant restrito ao próprio subdomain**
- **Session-based auth** com expiração

### ✅ Manutenibilidade
- **Código reutilizável** (AdaptiveDashboardLayout)
- **Single source of truth** para autenticação
- **Fácil adicionar novos tipos** de usuário
- **Layout específicos** só para features únicas

### ✅ Escalabilidade
- **Suporta novos tipos** de usuário facilmente
- **Permite hierarquias** (super-admin, moderador, etc.)
- **Dashboard unificado** pode renderizar qualquer interface
- **Server Components** otimizam performance

---

## 🔮 Futuro: Roles e Permissões

A arquitetura já está preparada para expansão:

```typescript
// Futuro: Sistema de Roles
session = {
  type: 'tenant',
  role: 'moderator', // owner, admin, moderator, viewer
  permissions: ['read:products', 'write:products'],
  subdomain: 'loja-exemplo'
}

// Componente adaptativo renderiza features baseado em role
<AdaptiveDashboardLayout>
  {session.permissions.includes('write:products') && (
    <CreateProductButton />
  )}
</AdaptiveDashboardLayout>
```

---

## 📝 Checklist de Implementação

### ✅ Fase 1: Login Unificado
- [x] Criar unifiedLogin() em actions.ts
- [x] Atualizar página de login para usar unifiedLogin()
- [x] Redirecionar /krov/login para /login
- [x] Testar login como admin
- [x] Testar login como tenant

### ✅ Fase 2: Dashboard Adaptativo
- [x] Criar /dashboard/layout.tsx com redirecionamento
- [x] Criar /dashboard/page.tsx com detecção de tipo
- [x] Atualizar login para redirecionar para /dashboard
- [ ] Testar fluxo completo admin
- [ ] Testar fluxo completo tenant

### 🔄 Fase 3: Componentes Adaptativos
- [x] Criar AdaptiveDashboardLayout component
- [ ] Migrar layouts existentes para usar componente
- [ ] Adicionar props específicas por tipo
- [ ] Documentar uso do componente

### 📅 Fase 4: Features Avançadas (Futuro)
- [ ] Implementar sistema de roles
- [ ] Implementar permissões granulares
- [ ] Criar UI para gerenciar permissões
- [ ] Adicionar logs de auditoria

---

## 🚀 Como Usar

### Para Desenvolvedores

**1. Login sempre em `/login`:**
```typescript
// Não importa se admin ou tenant
router.push('/login');
```

**2. Dashboard sempre em `/dashboard`:**
```typescript
// Será redirecionado automaticamente
router.push('/dashboard');
```

**3. Validação em Server Actions:**
```typescript
'use server';
export async function myAction(subdomain: string) {
  // SEMPRE validar
  await requireTenantAccess(subdomain);
  
  // Seu código aqui
}
```

### Para Usuários Finais

**Admin:**
```
1. Acesse vematize.com/login
2. Digite: admin / senha
3. → Redirecionado para /krov/dashboard
```

**Cliente:**
```
1. Acesse vematize.com/login
2. Digite: cliente@email.com / senha
3. → Redirecionado para /loja-exemplo/dashboard
```

---

## 📚 Referências

- `src/app/(auth)/login/actions.ts` - Login unificado
- `src/app/dashboard/` - Dashboard adaptativo
- `src/lib/auth.ts` - Funções de autenticação
- `src/middleware.ts` - Proteção de rotas
- `CORRECOES_IDOR_RESUMO.md` - Correções de segurança

---

**Última atualização:** 07/10/2025  
**Versão:** 2.0 - Arquitetura Adaptativa

