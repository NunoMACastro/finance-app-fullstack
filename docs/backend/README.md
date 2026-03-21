# Backend Overview

Stack:
- Node.js + Express
- TypeScript (ESM)
- MongoDB (Mongoose)
- Zod para validacao
- JWT (access + refresh)

Pasta fonte: `backend/src`

## Estrutura

- `app.ts`: instancia Express, middlewares globais, health/ready/metrics
- `server.ts`: bootstrap (DB + HTTP + scheduler)
- `routes/index.ts`: montagem de routers `/api/v1/*`
- `modules/*`: logica por dominio
- `middleware/*`: auth, contexto de conta, erros, metricas
- `models/*`: schemas/indexes Mongoose
- `lib/*`: utilitarios (JWT, month, hash, password, api errors)
- `jobs/scheduler.ts`: jobs cron
- `scripts/migrate-accounts.ts`: migracao/backfill de contas
- `tests/unit` e `tests/integration`

## Modulos

- `auth`
  - register/login/refresh/logout/me/tutorial
  - update profile/email/password
  - sessions (list/revoke/remover revogadas/revoke-all; `sid` canonico e `jti` legado no listado)
  - export user data
  - delete/deactivate account
- `accounts`
  - contas partilhadas, convites, membros, roles, leave
- `budgets`
  - templates, leitura/edicao de budget mensal, copy
- `income-categories`
  - CRUD de categorias de receita (default protegida)
- `transactions`
  - CRUD de lancamentos e resumo mensal
- `recurring`
  - CRUD de regras recorrentes + generate + reassign category
- `stats`
  - semestre, ano, compare-budget e insights IA dedicados
  - snapshots calculados on-demand
  - insight IA via recurso dedicado assincrono (`/stats/insights`) sobre snapshot base

## Middleware de seguranca e observabilidade

- `helmet`
- `cors` com origem configuravel
- rate limit global + rate limit auth
- request-id por pedido
- logs estruturados (pino)
- `/health`, `/ready`, `/metrics`

## Contratos de erro

Formato padrao:

```json
{
  "code": "ERROR_CODE",
  "message": "Mensagem",
  "details": {
    "field": "detalhe opcional"
  }
}
```

- `422` para validacao (`VALIDATION_ERROR`) e regras de negocio (`ApiError` unprocessable)
- `401` para autenticacao
- `403` para autorizacao
- `404` para recurso nao encontrado
- `500` para erro inesperado

## Scoping de autorizacao

1. `requireAuth` valida JWT e popula `req.auth.userId`.
2. endpoints financeiros usam `requireStrictAccountContext` e exigem `X-Account-Id`.
3. Membership ativa e role sao carregadas para `req.auth`.

Guards de role:
- leitura financeira: `owner|editor|viewer`
- escrita financeira: `owner|editor`
- gestao de membros/convites: `owner` (validados no service de accounts)
