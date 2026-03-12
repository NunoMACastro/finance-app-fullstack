# Frontend Overview

Stack:
- React 18
- TypeScript
- Vite
- Axios
- React Router (lazy routes)
- Motion + componentes UI (Radix + MUI no bundle)

Pasta fonte: `frontend/src`

## Objetivo

UI mobile-first para:
- autenticacao,
- gestao mensal (orcamento + lancamentos + recorrencias),
- stats por periodo,
- contas pessoais e partilhadas,
- tutorial guiado contextual.

## Estrutura

- `main.tsx`: bootstrap
- `app/App.tsx`: providers, gating de auth, maintenance mode, aviso desktop
- `app/routes.ts`: rotas lazy (`/`, `/stats`)
- `app/components/*`: ecras e layout
- `app/lib/*`: API client, stores locais, contextos e tipos
- `styles/*`: tema, tailwind, fontes

## Design System

- Tokens e regras semânticas: [`./design-tokens.md`](./design-tokens.md)
- Guardrail automático: `npm run check:tokens` (incluído em `npm run lint` e CI)

## Providers globais

- `AuthProvider`
  - sessao, user profile, login/register/logout
  - complete tutorial
- `AccountProvider`
  - lista de contas
  - conta ativa e role
  - create/join/leave e gestao de membros

## Fluxo de execucao

1. App arranca e verifica maintenance mode.
2. AuthProvider tenta reidratacao de sessao.
3. Se autenticado, AccountProvider resolve contas e conta ativa.
4. Router renderiza `MonthPage` ou `StatsPage`.
5. Todas as chamadas autenticadas injetam `Authorization` e `X-Account-Id`.

## Comportamentos de UX importantes

- Aviso temporario em viewport larga (nao bloqueia desktop).
- Safe-area iOS aplicada no header e bottom nav.
- Tutorial auto apenas para users sem `tutorialSeenAt` e com delay de 1 segundo.
- Tutorial por pagina (month/stats), sem navegacao forcada.
