# Frontend Arquitetura

## Bootstrap

`src/main.tsx` monta `App` no `#root`.

`App` (`app/App.tsx`):
1. verifica maintenance mode
2. envolve app com `AuthProvider`, `ThemePreferencesProvider` e `AccountProvider`
3. renderiza `RouterProvider` (`createAppRouter()`) com layout/pages v3
4. injeta `Toaster` global
5. injeta `Analytics` (`@vercel/analytics/react`) para page views

## Routing

Arquivo: `app/routes.ts`

Rotas lazy:
- `/` -> `MonthPage`
- `/stats` -> `StatsPage`
- `/recurring/*` -> `RecurringRulesPage` (entrada dedicada)
- `/profile/recurring` -> `RecurringRulesPage` (entrada a partir de Profile)
- `/budget/:month/edit` -> `BudgetEditorPage`
- `/profile` -> `ProfilePage` (hub)
- `/profile/account` -> `ProfileAccountPage`
- `/profile/security` -> `ProfileSecurityPage`
- `/profile/preferences` -> `ProfilePreferencesPage`
- `/profile/shared` -> `ProfileSharedPage` (hub)
- `/profile/shared/accounts` -> `ProfileSharedAccountsPage`
- `/profile/shared/create` -> `ProfileSharedCreatePage`
- `/profile/shared/join` -> `ProfileSharedJoinPage`
- `/profile/shared/members` -> `ProfileSharedMembersPage`
- `/month/:month/category/:categoryId/movements` -> `CategoryMovementsPage`

Layout comum:
- `AppLayout`
  - `AppShellV3`: shell mobile-first sem ornamentacao pesada
  - `TopBarV3`: marca + ações globais (privacidade, tutorial, logout) com separador curvo
  - seletor de conta ativa renderizado no layout abaixo do header apenas quando:
    - existe conta `shared`
    - rota é `/` ou `/stats`
  - `BottomNavV3`: tabs compactas com estado ativo discreto
  - area de conteudo sem animação global no `Outlet`
  - os blocos principais de cada página usam `PageSectionFadeInV3` para `fade-only` local (`opacity` apenas, sem slide)
  - tutorial overlay

## Componentes de pagina

### MonthPage
Responsabilidades:
- carregar resumo mensal (`transactionsApi.getMonthSummary`)
- carregar budget mensal (`budgetApi.get`)
- gerir dialog de novo lancamento
- carregar e gerir categorias de receita
- encaminhar para `BudgetEditorPage` quando o budget precisa de edicao
- gerir regras recorrentes

Pontos chave:
- botao de novo lancamento desativado se budget nao estiver pronto
- CTA para criar/editar budget navega para `/budget/:month/edit`
- feedback visual para roles sem escrita (`viewer`)
- secao intermédia usa `MonthFinancialRuler` para resumir receitas/despesas/restante + `€/dia` com estados semanticos
- categorias de despesa usam linhas flat (`MonthExpenseCategoryRow`) com ordenacao hibrida:
  - `expense` primeiro (urgencia)
  - `reserve` no fim (ordem do orçamento)
- detalhe de saídas por categoria usa 2 níveis:
  - `CategoryExpensesSheet` para preview (ultimas 8)
  - `CategoryMovementsPage` para histórico completo com filtros avançados client-side
- receitas surgem num bloco compacto separado abaixo das categorias
- cores de categorias sao estaveis por `colorSlot` (1..9) vindo do budget, evitando variacao por ordenacao da lista

### StatsPage
Responsabilidades:
- carregar snapshot base (`statsApi.getSemester`/`getYear`) sem depender da IA
- manter escopo account-scoped via conta ativa (sem agregação global no v1)
- compor stack v3 (`Pulse`, `Drivers`, `Tendência`, `Projeção`)
- usar `stats-view-model` para derivar métricas e estados semânticos
- expor apenas CTA compacto para abrir a análise IA dedicada
- suportar detalhe por categoria em `StatsCategoryInsightSheet`
- tratar erros com retry

### StatsInsightsPage
Responsabilidades:
- receber `period` e `forecastWindow` via query params
- mostrar o período recebido apenas como contexto visual; sem seletor `6M/12M`
- não expor um controlo visível para `forecastWindow`; o valor é herdado do contexto de origem ou do deep link
- não disparar geração no load
- iniciar geração apenas após clique explícito em `Gerar insight IA`
- usar `POST /stats/insights` como entrypoint principal
- fazer polling de `GET /stats/insights/:id` enquanto estado = `pending`
- suspender polling automático após falhas consecutivas e expor CTA explícita para retomar a verificação
- renderizar report IA estruturado em formato `summary + tabs`
- limpar o estado local quando muda `period`, `forecastWindow` ou conta ativa
- organizar a leitura em tabs internas:
  - `Agora`
- `Ações`
- `Categorias`
- reduzir o resumo visível a 1-2 frases, sem `Ver mais`
- mostrar a lista completa de categorias em foco na respetiva tab
- usar `colorSlot` opcional nas `categoryInsights` quando disponível para manter coerência visual com o budget
- suportar `Gerar novamente` e `Voltar para estatísticas`

### BudgetEditorPage
Responsabilidades:
- editar categorias/percentagens do budget mensal
- editar tipo de categoria (`kind`: `Despesa`/`Reserva`) por linha
- aplicar templates predefinidos
- guardar com `budgetApi.save`
- manter `colorSlot` por categoria para coerencia visual entre editor e vista mensal

### RecurringRulesPage
Responsabilidades:
- gerir regras recorrentes em ecrã dedicado
- suportar CRUD, pausa/reativacao e geracao manual por mes
- expor estado de saude por regra (`ok`/`fallback`)
- permitir reatribuicao de categoria com migracao opcional de historico fallback
- servir tanto `/profile/recurring` como `/recurring/*` (alias)

### ProfilePage
Responsabilidades:
- atuar como hub de configurações (`settings list`) e navegar para secções dedicadas

### ProfileAccountPage
Responsabilidades:
- gerir perfil base (`nome`, `moeda`)
- atualizar email com password atual
- exportar dados
- desativar conta com confirmação forte

### ProfileSecurityPage
Responsabilidades:
- alterar password
- listar/revogar sessões
- remover sessões já revogadas do histórico

### ProfilePreferencesPage
Responsabilidades:
- gerir tema e preferências de ocultação de valores
- reset tutorial

### ProfileSharedPage
Responsabilidades:
- atuar como hub de navegação para as operações de conta partilhada

### ProfileSharedAccountsPage
Responsabilidades:
- trocar conta ativa
- sair da conta partilhada ativa

### ProfileSharedCreatePage
Responsabilidades:
- criar conta partilhada

### ProfileSharedJoinPage
Responsabilidades:
- entrar por código de convite

### ProfileSharedMembersPage
Responsabilidades:
- gerar código de convite (owner)
- listar membros
- atualizar role de membro
- remover membro com confirmação

## TutorialTour

Arquivo: `app/components/tutorial-tour.tsx`

Caracteristicas:
- escopo por pagina (`month` ou `stats`)
- inclui passos de header (conta ativa, acoes, privacidade, tutorial, logout)
- inclui passos especificos da pagina
- em `stats`, separa explicacao de:
  - saldo do periodo
  - breakdown do pulse
  - CTA para abrir a análise IA dedicada
- overlay com highlight do elemento alvo
- animacoes por fade no local (sem vir do canto)
- delay de auto-start (feito no `layout.tsx`, 1000ms)
- auto-run apenas se `user.tutorialSeenAt === null`
- `skip` e `done` marcam tutorial como concluido no backend

## Motion de entrada

- o contrato de page entry vive no primitive `PageSectionFadeInV3`
- entradas de página são aplicadas por blocos principais/top-level sections, não no shell
- o efeito é `fade-only` curto (`opacity`), sem `x`, sem `y`, sem `scale`
- `prefers-reduced-motion` desativa estas animações
- animações funcionais fora de page entry podem manter comportamento próprio quando justificadas

## Design constraints implementadas

- Shell principal com largura maxima de telemovel (`max-w-[430px]`).
- `viewport-fit=cover` no `index.html`.
- safe-area top/bottom em header e nav.
- Aviso desktop/tablet apenas informativo.
- Estrutura visual governada por `docs/frontend/ui-v3-spec.md`.

## Build optimization

`vite.config.ts`:
- `chunkSizeWarningLimit: 350`
- `manualChunks` para separar vendors:
  - `react-vendor`
  - `radix-vendor`
  - `mui-vendor`
  - `emotion-vendor`
  - `charts-vendor`
  - `ui-vendor`
  - `vendor`
