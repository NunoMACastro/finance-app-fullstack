# Frontend Arquitetura

## Bootstrap

`src/main.tsx` monta `App` no `#root`.

`App` (`app/App.tsx`):
1. verifica maintenance mode
2. envolve app com `AuthProvider`, `ThemePreferencesProvider` e `AccountProvider`
3. renderiza `RouterProvider` (`createAppRouter()`) com layout/pages v2
4. injeta `Toaster` global

## Routing

Arquivo: `app/routes.ts`

Rotas lazy:
- `/` -> `MonthPage`
- `/stats` -> `StatsPage`
- `/budget/:month/edit` -> `BudgetEditorPage`
- `/profile` -> `ProfilePage`

Layout comum:
- `AppLayout`
  - `AppShellV3`: shell mobile-first sem ornamentacao pesada
  - `TopBarV3`: 2 linhas (acoes globais + contexto de conta)
  - `BottomNavV3`: tabs compactas com estado ativo discreto
  - `OverflowActionsSheetV3`: acoes rapidas em mobile para o botao `...`
  - area de conteudo
  - dialogs de contas/membros
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
- categorias de despesa usam linhas flat (`MonthExpenseCategoryRow`) ordenadas por urgência
- detalhe de saídas por categoria abre em `CategoryExpensesSheet` (bottom sheet em mobile)
- receitas surgem num bloco compacto separado abaixo das categorias
- cores de categorias sao estaveis por `colorSlot` (1..9) vindo do budget, evitando variacao por ordenacao da lista

### StatsPage
Responsabilidades:
- carregar stats (`statsApi.getSemester`/`getYear`)
- renderizar tendencia, categorias, budget vs actual e forecast
- suportar detalhe por categoria com `categorySeries`
- tratar erros com retry

### BudgetEditorPage
Responsabilidades:
- editar categorias/percentagens do budget mensal
- aplicar templates predefinidos
- guardar com `budgetApi.save`
- manter `colorSlot` por categoria para coerencia visual entre editor e vista mensal

### ProfilePage
Responsabilidades:
- gerir perfil (`nome`, `moeda`, `email`, password)
- gerir sessoes e seguranca
- gerir preferencias (tema/ocultar valores/tutorial)
- exportar dados e desativar conta
- gerir contas partilhadas no modo hub

## TutorialTour

Arquivo: `app/components/tutorial-tour.tsx`

Caracteristicas:
- escopo por pagina (`month` ou `stats`)
- inclui passos de header (conta ativa, acoes, privacidade, menu de utilizador)
- inclui passos especificos da pagina
- overlay com highlight do elemento alvo
- animacoes por fade no local (sem vir do canto)
- delay de auto-start (feito no `layout.tsx`, 1000ms)
- auto-run apenas se `user.tutorialSeenAt === null`
- `skip` e `done` marcam tutorial como concluido no backend

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
