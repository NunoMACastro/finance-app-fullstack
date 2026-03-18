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
- recurring rules (inclui metadados operacionais: `lastGenerationAt`, `lastGenerationStatus`, `pendingFallbackCount`)
- stats (`categorySeries` incluido)
  - `StatsSnapshot.insight` opcional (`text`, `source`, `generatedAt`, `model`) quando backend enriquece com IA
  - `StatsSnapshot.totalsBreakdown` opcional:
    - `consumption`, `savings`, `unallocated`, `potentialSavings`
    - `rates.savings`, `rates.unallocated`, `rates.potentialSavings`
- transactions incluem metadados de categoria recorrente:
  - `categoryResolution?: direct | fallback`
  - `requestedCategoryId?` quando houve fallback

Notas de budget:
- `BudgetCategory` inclui `colorSlot` (1..9) para mapear categorias para slots de cor do tema.
- `BudgetCategory` inclui `kind` (`expense | reserve`) para separar categorias de despesa corrente vs reserva.
- o backend devolve `colorSlot` em `GET /budgets/:month` e templates; o frontend preserva esse campo em `budgetApi.save`.
- o backend devolve `kind` normalizado; payloads antigos sem `kind` continuam aceites.
- compatibilidade: categorias antigas sem `colorSlot` recebem slot deterministico no backend (sem migracao manual obrigatoria).
- compatibilidade de `kind` (normalizacao lazy):
  - `Poupança/Poupanca/Investimento` => `reserve`
  - restantes => `expense`

## API layer

Arquivo: `app/lib/api.ts`

Modulos:
- `authApi`
- `accountsApi`
- `incomeCategoriesApi`
- `transactionsApi`
- `recurringApi`
  - `list/create/update/delete`
  - `generate(month)` para corrida manual de geracao recorrente
  - `reassignCategory(id, { categoryId, migratePastFallbackTransactions })`
- `budgetApi`
- `statsApi`
  - `statsApi.getSemester/getYear` suportam `options.includeInsight?: boolean`
  - quando `includeInsight=true`, resposta pode vir com `snapshot.insight` inline

Modo unico:
- real API via `httpClient`

## HTTP client

Arquivo: `app/lib/http-client.ts`

### Request interceptor

- anexa `Authorization` com access token
- anexa `X-Account-Id` se conta ativa existir
- `Stats` v1 usa o mesmo `X-Account-Id` (escopo por conta ativa, sem modo global)

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
- `removeRevokedSessions`
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

Comportamento de UI (seletor de conta):
- aparece apenas quando existe pelo menos uma conta `shared`
- aparece apenas nas rotas contextuais: `/` e `/stats`
- fica oculto nas restantes rotas para reduzir clutter e evitar troca acidental de contexto

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

- Stats/Month usam estados de loading/erro robustos para mudancas rapidas de conta/periodo.
- Stats faz carregamento em 2 fases para UX responsiva:
  - primeiro request com `includeInsight=false` para render imediato do snapshot base
  - segundo request com `includeInsight=true` para enriquecer apenas o texto de insight
- narrativa final prioriza `snapshot.insight.text`; fallback local deterministico (`buildPulseInsight`) quando ausente/erro.
- metricas do `Pulse`:
  - preferem `snapshot.totalsBreakdown` quando presente
  - fallback local deterministico (derivado de `budgetVsActual` + `totals`) quando ausente
  - `Aderência ao orçamento` usa desvio absoluto agregado por categoria (nao e a mesma metrica de `Valor por alocar`)
  - labels dinamicas para sinal negativo:
    - `Valor por alocar` / `Valor em falta`
    - `Taxa por alocar` / `Taxa em falta`

## Formatacao (datas e moeda)

Arquivo: `app/lib/formatting.ts`

- moeda usa `currency` do perfil
- locale e timezone da formatacao sao fixos:
  - locale: `pt-PT`
  - timezone: `Europe/Lisbon`
