# Visao Geral do Sistema

## Objetivo do produto

Aplicacao de gestao financeira pessoal e partilhada, com:
- autenticacao com JWT,
- contas (workspaces) pessoais e partilhadas,
- orcamento mensal por categorias,
- lancamentos manuais e recorrentes,
- stats agregadas por periodo,
- tutorial guiado na UI.

## Blocos principais

- Frontend: React + Vite + TypeScript
  - Renderiza Month, Stats, Profile e Budget Editor
  - Gerencia autenticacao e conta ativa
  - Injeta `X-Account-Id` em pedidos autenticados
- Backend: Node.js + Express + TypeScript + Mongoose
  - API REST em `/api/v1`
  - Autorizacao por membership e role
  - Regras de negocio de orcamento/transacoes/stats
- MongoDB
  - Persistencia de users, accounts, memberships, income categories, budgets, transactions, recurring rules, stats snapshots e refresh tokens

## Arquitetura funcional

1. User autentica via `/auth/login` ou `/auth/register`.
2. Frontend guarda `accessToken` + `refreshToken`.
3. Frontend carrega `accounts` e escolhe `activeAccountId`.
4. Cada pedido financeiro segue com `Authorization: Bearer <token>` e `X-Account-Id`.
5. Backend valida token e contexto de conta (`requireAccountContext`).
6. Regras por role:
   - leitura financeira: `owner|editor|viewer`
   - escrita financeira: `owner|editor`
   - gestao de membros/convites: `owner`

## Componentes backend

- Middleware global de seguranca:
  - `helmet`, `cors`, rate limit global e rate limit de auth
- Middleware de auth:
  - `requireAuth` valida JWT access token
- Middleware de contexto de conta:
  - resolve conta via `X-Account-Id` ou fallback para `personalAccountId`
  - valida membership ativa
- Modulos de dominio:
  - `auth`, `accounts`, `income-categories`, `budgets`, `transactions`, `recurring`, `stats`
- Scheduler:
  - job diario gera recorrencias e materializa snapshots de stats

## Componentes frontend

- `AuthProvider`:
  - reidratacao de sessao
  - login/register/logout
  - update profile/email/password
  - tutorial (`complete`/`reset`)
  - sessions/export/delete account
- `ThemePreferencesProvider`:
  - aplica paleta visual
  - persiste preferencia de tema
- `AccountProvider`:
  - lista de contas
  - conta ativa por utilizador (persistida em localStorage)
  - operacoes de contas partilhadas
- `http-client`:
  - injecao de token e `X-Account-Id`
  - refresh token automatico em 401
  - fila para pedidos concorrentes durante refresh
- Rotas lazy:
  - `/` (Month)
  - `/stats` (Stats)
  - `/budget/:month/edit` (Budget editor)
  - `/profile` (Profile)

## Decisoes estruturais importantes

- `totalBudget` e derivado de receitas do mes (backend como fonte de verdade).
- Lancamentos manuais exigem orcamento valido no mes alvo.
- Receitas exigem categoria de receita ativa e existe default protegida por conta.
- Conta pessoal e invariante forte: cada user deve ter 1 conta pessoal + membership owner.
- Multi-conta e role-based access control aplicados em todo o scoping financeiro.

## Observabilidade e operacao

- Health:
  - `GET /health`
  - `GET /ready`
- Metricas Prometheus:
  - `GET /metrics`
- Logs:
  - `pino` com sanitizacao de URI Mongo em logs de conexao

## Pipeline de qualidade

- Backend CI:
  - build + unit + integration
- Frontend CI:
  - typecheck + lint + tests + build
