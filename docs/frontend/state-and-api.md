# Frontend Estado, API Client e Contextos

## Tipos partilhados

Arquivo: `app/lib/types.ts`

Contem contratos espelho do backend para:
- auth
- accounts/memberships
- budgets/templates
- income categories
- transactions
- recurring rules
- stats (`categorySeries` incluido)

Notas de budget:
- `BudgetCategory` inclui `colorSlot` (1..9) para mapear categorias para slots de cor do tema.
- o backend devolve `colorSlot` em `GET /budgets/:month` e templates; o frontend preserva esse campo em `budgetApi.save`.
- compatibilidade: categorias antigas sem `colorSlot` recebem slot deterministico no backend (sem migracao manual obrigatoria).

## API layer

Arquivo: `app/lib/api.ts`

Modulos:
- `authApi`
- `accountsApi`
- `incomeCategoriesApi`
- `transactionsApi`
- `recurringApi`
- `budgetApi`
- `statsApi`

Dois modos:
- real API via `httpClient`
- mock em memoria quando `config.useMock=true`

## HTTP client

Arquivo: `app/lib/http-client.ts`

### Request interceptor

- anexa `Authorization` com access token
- anexa `X-Account-Id` se conta ativa existir

### Response interceptor

- em `401`:
  - tenta refresh uma vez
  - reexecuta request original
- fila pedidos concorrentes durante refresh
- se refresh falhar:
  - limpa tokens
  - dispatch evento `auth:logout`

### Normalizacao de erro

Retorna shape previsivel:

```ts
{ code: string; message: string; details?: Record<string,string> }
```

## Auth context

Arquivo: `app/lib/auth-context.tsx`

Estado:
- `user`
- `isAuthenticated`
- `isLoading`
- `isInitialising`

Acoes:
- `login`
- `register`
- `logout`
- `refreshUser`
- `completeTutorial`
- `resetTutorial`
- `updateProfile`
- `updateEmail`
- `updatePassword`
- `listSessions`
- `revokeSession`
- `revokeAllSessions`
- `exportData`
- `deleteMe`
- `toggleAmountVisibility`

Comportamentos:
- reidratacao inicial com tokens locais
- forced logout via evento global
- preferencia de ocultar valores por defeito com override de sessao

## Theme preferences context

Arquivo: `app/lib/theme-preferences.tsx`

Estado:
- `theme`
- `isSaving`

Acoes:
- `setTheme`

Comportamentos:
- aplica `data-theme` no `documentElement`
- persiste fallback local quando user nao autenticado
- semantica funcional: tema unico (sem estado dark/light separado)
- normaliza aliases legados (`ocean/forest/sunset/graphite`) para IDs atuais
- compatibilidade de dados: preferencia continua no campo `preferences.themePalette`

## Account context

Arquivo: `app/lib/account-context.tsx`

Estado:
- `accounts`
- `activeAccountId`
- `activeAccount`
- `activeAccountRole`
- `canWriteFinancial`

Acoes:
- `setActiveAccount`
- `refreshAccounts`
- `createSharedAccount`
- `joinByCode`
- `generateInviteCode`
- `listMembers`
- `updateMemberRole`
- `removeMember`
- `leaveAccount`

Politica de selecao da conta ativa:
1. conta guardada em localStorage (por user)
2. fallback para `user.personalAccountId`
3. fallback para `isPersonalDefault`
4. fallback para primeira conta da lista

## Stores locais

### token-store
Arquivo: `app/lib/token-store.ts`

- persiste `accessToken` e `refreshToken` em localStorage
- expande helper para verificar expiracao de access token via payload JWT

### account-store
Arquivo: `app/lib/account-store.ts`

- guarda `activeAccountId` por user em localStorage
- expoe valor em memoria para o `http-client` injetar no header

## Gestao de concorrencia e race conditions

- `useApi` hook usa `callId` para ignorar respostas obsoletas.
- Stats/Month usam estados de loading/erro robustos para mudancas rapidas de conta/periodo.

## Formatacao (datas e moeda)

Arquivo: `app/lib/formatting.ts`

- moeda usa `currency` do perfil
- locale e timezone da formatacao sao fixos:
  - locale: `pt-PT`
  - timezone: `Europe/Lisbon`
