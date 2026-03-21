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
  - `StatsSnapshot.totalsBreakdown` opcional:
    - `consumption`, `savings`, `unallocated`, `potentialSavings`
    - `rates.savings`, `rates.unallocated`, `rates.potentialSavings`
- insight IA dedicado:
  - `StatsInsightStatusResponse`
  - `StatsInsightReport`
  - `StatsInsightHighlight`, `StatsInsightRisk`, `StatsInsightAction`, `StatsInsightCategoryItem`
  - `StatsInsightCategoryItem.colorSlot?` preserva o slot de cor estável da categoria quando o backend o conhece
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
  - `statsApi.getSemester/getYear` devolvem apenas snapshot base
  - `statsApi.requestInsight`
  - `statsApi.getInsight`
  - `statsApi.getLatestInsight` (auxiliar; nao usado automaticamente pela UI principal)

Modo unico:
- real API via `httpClient`

## HTTP client

Arquivo: `app/lib/http-client.ts`

### Request interceptor

- anexa `Authorization` com access token
- anexa `X-Account-Id` em todos os requests account-scoped
- `Stats` v1 usa o mesmo `X-Account-Id` (escopo por conta ativa, sem modo global)

### Response interceptor

- em `401`:
  - tenta refresh uma vez
  - reexecuta apenas requests idempotentes (`GET/HEAD/OPTIONS`) ou marcados como safe
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
- reidratacao inicial por `POST /auth/refresh` com cookie `HttpOnly`
- forced logout via evento global
- sincronizacao multi-tab via `BroadcastChannel`
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
- IDs suportados: `brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`
- default/fallback: `ciano`
- normaliza aliases legados (`ocean/forest/sunset/graphite`) para IDs atuais
- compatibilidade de naming: `ambar` e normalizado para ID canónico `amber`
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
- aparece apenas nas rotas contextuais: `/` e rotas `startsWith("/stats")`
- fica oculto nas restantes rotas para reduzir clutter e evitar troca acidental de contexto

Politica de selecao da conta ativa:
1. conta guardada em localStorage (por user)
2. fallback para `user.personalAccountId`
3. fallback para `isPersonalDefault`
4. fallback para primeira conta da lista

## Stores locais

### token-store
Arquivo: `app/lib/token-store.ts`

- guarda apenas `accessToken` em memoria
- refresh token nunca fica acessivel a JS
- expande helper para verificar expiracao de access token via payload JWT

### account-store
Arquivo: `app/lib/account-store.ts`

- guarda `activeAccountId` por user em localStorage
- expoe valor em memoria para o `http-client` injetar no header

## Gestao de concorrencia e race conditions

- Stats/Month usam estados de loading/erro robustos para mudancas rapidas de conta/periodo.
- `/stats` carrega apenas o snapshot base e nunca dispara pedidos de insight IA.
- a analise IA vive em `/stats/insights` e so faz `POST /stats/insights` apos clique explicito do utilizador.
- a pagina dedicada usa `POST /stats/insights` como entrypoint principal; `GET /stats/insights/:id` serve apenas para polling quando o backend responde `pending`.
- a pagina dedicada pausa o polling automatico apos falhas consecutivas e permite retoma manual sem perder o pedido pendente.
- `getLatestInsight` permanece disponivel no client por compatibilidade/API auxiliar, mas nao faz parte do fluxo automatico da interface.
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
