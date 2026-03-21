# Frontend Overview

Stack:
- React 18
- TypeScript
- Vite
- Axios
- React Router (lazy routes)
- Motion + componentes UI (Radix e primitives internas)

Pasta fonte: `frontend/src`

## Objetivo

UI mobile-first para:
- autenticacao,
- gestao mensal (orcamento + lancamentos + recorrencias),
- gestao de categorias de receita,
- stats por periodo (com projecao 3M/6M),
- contas pessoais e partilhadas,
- tutorial guiado contextual.

## Estrutura

- `main.tsx`: bootstrap
- `app/App.tsx`: providers, gating de auth, maintenance mode, aviso desktop
- `app/routes.ts`: rotas lazy (`/`, `/stats`, `/stats/insights`, `/recurring/*`, `/profile`, `/profile/*`, `/budget/:month/edit`, `/month/:month/category/:categoryId/movements`)
- `app/components/*`: ecras e layout
- `app/lib/*`: API client, stores locais, contextos e tipos
- `styles/*`: tema, tailwind, fontes

## Design System

- Tokens e regras semanticas: [`./design-tokens.md`](./design-tokens.md)
- Especificacao de estrutura visual v3: [`./ui-v3-spec.md`](./ui-v3-spec.md)
- Guardrails:
  - `npm run check-theme-contract`
  - `npm run check:tokens`
  - `check:tokens` cobre todo o `src/` com extensões suportadas; `src/imports/` não tem exclusão especial

Padrao auth v3:
- login/registo sem tabs, com hero de superfície de marca do tema (gradiente ou sólido) + separador curvo
- corpo flat sem card (ver regras em [`./ui-v3-spec.md`](./ui-v3-spec.md))

Padrao de detalhe por categoria (Month):
- `bottom sheet` apenas para preview rapido (ultimas entradas).
- historico longo em ecrã full-screen dedicado com filtros.

Escopo de stats v1:
- `/stats` usa sempre a conta ativa (`X-Account-Id`), sem agregação global.
- a UI segue padrão `Action-first + Storytelling`:
  - `Pulse do período`
  - `Drivers` (top 3)
  - `Tendência`
  - `Projeção`
- o insight IA detalhado vive numa página dedicada (`/stats/insights`) e so e pedido apos acao explicita do utilizador
- detalhe de categoria abre em `sheet` contextual, sem expansão inline pesada.

Padrao de perfil v3:
- `/profile` funciona como hub (`settings list`).
- cada secção abre em subpágina dedicada (`/profile/*`).
- fluxos de conta partilhada (`criar/join`) ficam centralizados em `/profile/shared`.
- `Conta partilhada` usa `hub + subrotas` (`accounts/create/join/members`) com back contextual para `/profile/shared`.
- no perfil, controlos interativos seguem target mínimo `44px` e política de 1 CTA primária por subpágina.

## Theming architecture

- `theme.css` e apenas base/contrato semantico (sem cores literais).
- Cada tema runtime vive em `src/styles/themes/<id>.css`.
- O contrato obrigatório `--t-*` esta em `src/styles/themes/_template.css`.
- Tokens de gradiente por tema sao opcionais (`--t-gradient-*`, `--t-category-gradient-*`), com fallback sólido no runtime.
- O runtime aplica `data-theme="<id>"` no `documentElement`.
- IDs de tema oficiais: `brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`.
- Labels de UI: `Brisa`, `Calma`, `Aurora`, `Terra`, `Maré`, `Ambar`, `Ciano`.
- Nao existe modo dark/light separado para o utilizador.

## Providers globais

- `AuthProvider`
  - sessao, user profile, login/register/logout
  - update profile/email/password
  - complete/reset tutorial
  - sessions/export/delete account
  - toggle de visibilidade de valores
- `ThemePreferencesProvider`
  - aplica tema visual (`data-theme`)
  - persiste preferencia de tema
  - normaliza aliases legados para IDs atuais
- `AccountProvider`
  - lista de contas
  - conta ativa e role
  - create/join/leave e gestao de membros

## Fluxo de execucao

1. App arranca e verifica maintenance mode.
2. AuthProvider tenta reidratacao de sessao.
3. ThemePreferencesProvider aplica o tema ativo no `documentElement`.
4. Se autenticado, AccountProvider resolve contas e conta ativa.
5. Router renderiza as rotas lazy reais:
   - `MonthPage` (`/`)
   - `StatsPage` (`/stats`)
   - `StatsInsightsPage` (`/stats/insights`)
   - `RecurringRulesPage` (`/profile/recurring` e alias `/recurring/*`)
   - `BudgetEditorPage` (`/budget/:month/edit`)
   - `ProfilePage` e subpaginas (`/profile/*`)
   - `CategoryMovementsPage` (`/month/:month/category/:categoryId/movements`)
6. As chamadas account-scoped injetam `Authorization` e `X-Account-Id`; `auth/*` e `accounts/*` ficam fora desse header.
7. `Analytics` (Vercel) fica montado no root para recolha de page views.

## Comportamentos de UX importantes

- Aviso temporario em viewport larga (nao bloqueia desktop).
- Safe-area iOS aplicada no header e bottom nav.
- Tutorial auto apenas para users sem `tutorialSeenAt` e com delay de 1 segundo.
- Tutorial por pagina (month/stats), sem navegacao forcada.
