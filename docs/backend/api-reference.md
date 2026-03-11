# Backend API Reference

Base URL local: `http://localhost:3001/api/v1`

## Convencoes gerais

- Auth header:
  - `Authorization: Bearer <accessToken>`
- Conta ativa (endpoints financeiros):
  - `X-Account-Id: <accountId>` (opcional)
  - se ausente, backend usa `personalAccountId`
- Content-Type:
  - `application/json`

## Auth

### POST `/auth/register`
Cria utilizador, conta pessoal, membership owner e emite tokens.

Request:
```json
{
  "name": "Nuno",
  "email": "nuno@example.com",
  "password": "secret123"
}
```

Response `201`:
```json
{
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  },
  "user": {
    "id": "...",
    "email": "nuno@example.com",
    "name": "Nuno",
    "currency": "EUR",
    "locale": "pt-PT",
    "tutorialSeenAt": null,
    "personalAccountId": "..."
  }
}
```

### POST `/auth/login`
Request:
```json
{
  "email": "nuno@example.com",
  "password": "secret123"
}
```

Response `200`: igual a register.

### POST `/auth/refresh`
Request:
```json
{
  "refreshToken": "..."
}
```

Response `200`:
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### POST `/auth/logout`
Request opcional:
```json
{
  "refreshToken": "..."
}
```

Response `204`.

### GET `/auth/me`
Auth obrigatoria.

Response `200`: `UserProfile`.

### POST `/auth/tutorial/complete`
Auth obrigatoria. Marca tutorial como concluido.

Response `200`: `UserProfile` atualizado.

## Accounts

Todos requerem auth.

### GET `/accounts`
Lista contas do user.

Response `200`:
```json
[
  {
    "id": "...",
    "name": "Conta Pessoal",
    "type": "personal",
    "role": "owner",
    "isPersonalDefault": true
  }
]
```

### POST `/accounts`
Cria conta partilhada.

Request:
```json
{
  "name": "Familia Silva"
}
```

Response `201`: `AccountSummary`.

### POST `/accounts/join`
Entra numa conta por codigo.

Request:
```json
{
  "code": "ABC12345"
}
```

Response `200`: `AccountSummary`.

### POST `/accounts/:accountId/invite-codes`
Owner apenas. Gera/regenera codigo de convite.

Response `200`:
```json
{
  "code": "ABC12345",
  "expiresAt": "2026-03-18T12:00:00.000Z"
}
```

### POST `/accounts/:accountId/leave`
Sai da conta partilhada (respeita regras de ultimo owner).

Response `204`.

### GET `/accounts/:accountId/members`
Owner apenas. Lista membros ativos.

Response `200`:
```json
[
  {
    "userId": "...",
    "name": "Maria",
    "email": "maria@example.com",
    "role": "viewer",
    "status": "active"
  }
]
```

### PATCH `/accounts/:accountId/members/:userId/role`
Owner apenas.

Request:
```json
{
  "role": "editor"
}
```

Response `200`: `AccountMember` atualizado.

### DELETE `/accounts/:accountId/members/:userId`
Owner apenas. Remove membro (status inativo).

Response `204`.

## Budgets

Requer auth + account context.

### GET `/budgets/templates`
Retorna templates predefinidos.

### GET `/budgets/:month`
`month` formato `YYYY-MM`.

Response `200` (`MonthBudget`):
```json
{
  "accountId": "...",
  "month": "2026-03",
  "totalBudget": 2500,
  "categories": [
    { "id": "cat1", "name": "Despesas", "percent": 60 }
  ],
  "isReady": true
}
```

### PUT `/budgets/:month`
Guarda/substitui categorias do budget mensal.

Request:
```json
{
  "totalBudget": 999999,
  "categories": [
    { "id": "cat1", "name": "Despesas", "percent": 60 },
    { "id": "cat2", "name": "Lazer", "percent": 40 }
  ]
}
```

Nota: `totalBudget` e ignorado no backend (compatibilidade).

### POST `/budgets/:month/categories`
Adiciona categoria.

Request:
```json
{
  "name": "Poupanca",
  "percent": 20
}
```

### DELETE `/budgets/:month/categories/:categoryId`
Remove categoria.

### POST `/budgets/:month/copy-from/:sourceMonth`
Copia apenas categorias de `sourceMonth` para `month`.

## Transactions

Requer auth + account context.

### GET `/transactions?month=YYYY-MM`
Resumo mensal + listas por tipo.

Response `200` (`MonthSummary`):
```json
{
  "month": "2026-03",
  "totalIncome": 3000,
  "totalExpense": 1200,
  "balance": 1800,
  "incomeTransactions": [],
  "expenseTransactions": []
}
```

### POST `/transactions`
Cria lancamento.

Request:
```json
{
  "month": "2026-03",
  "date": "2026-03-10",
  "type": "expense",
  "origin": "manual",
  "description": "Supermercado",
  "amount": 45.5,
  "categoryId": "cat1"
}
```

Notas:
- `origin=manual` exige budget valido no mes.
- `origin=recurring` pode incluir `recurringRuleId`.

### PUT `/transactions/:id`
Atualiza campos permitidos.

Request exemplo:
```json
{
  "date": "2026-04-01",
  "amount": 80,
  "categoryId": "cat2"
}
```

### DELETE `/transactions/:id`
Remove transacao.

Response `204`.

## Recurring Rules

Requer auth + account context.

### GET `/recurring-rules`
Lista regras.

### POST `/recurring-rules`
Cria regra.

Request:
```json
{
  "type": "expense",
  "name": "Renda",
  "amount": 750,
  "dayOfMonth": 1,
  "categoryId": "hab",
  "startMonth": "2026-01"
}
```

### PUT `/recurring-rules/:id`
Atualiza regra.

### DELETE `/recurring-rules/:id`
Apaga regra.

### POST `/recurring-rules/generate?month=YYYY-MM`
Gera transacoes recorrentes para o mes e conta ativa.

Response `200`:
```json
{ "created": 3 }
```

## Stats

Requer auth + account context.

### GET `/stats/semester?endingMonth=YYYY-MM`
`endingMonth` opcional.

### GET `/stats/year?year=YYYY`
`year` opcional.

Response `200` (`StatsSnapshot`):
```json
{
  "periodType": "semester",
  "periodKey": "2026-S1",
  "totals": {
    "totalIncome": 12000,
    "totalExpense": 8000,
    "balance": 4000
  },
  "trend": [
    { "month": "2026-01", "income": 2000, "expense": 1300, "balance": 700 }
  ],
  "budgetVsActual": [
    {
      "categoryId": "cat1",
      "categoryName": "Despesas",
      "budgeted": 5000,
      "actual": 5200,
      "difference": -200
    }
  ],
  "categorySeries": [
    {
      "categoryId": "cat1",
      "categoryName": "Despesas",
      "monthly": [
        { "month": "2026-01", "budgeted": 800, "actual": 850 }
      ]
    }
  ],
  "forecast": {
    "projectedIncome": 2200,
    "projectedExpense": 1500,
    "projectedBalance": 700
  }
}
```

### GET `/stats/compare-budget?from=YYYY-MM&to=YYYY-MM`
Compara budgeted vs actual no intervalo.

## Codigos de erro comuns

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `REFRESH_TOKEN_INVALID`
- `REFRESH_TOKEN_REVOKED`
- `ACCOUNT_ACCESS_DENIED`
- `ACCOUNT_ROLE_FORBIDDEN`
- `ACCOUNT_OWNER_REQUIRED`
- `LAST_OWNER_PROTECTION`
- `LAST_OWNER_CANNOT_LEAVE`
- `PERSONAL_ACCOUNT_CANNOT_LEAVE`
- `INVITE_CODE_INVALID_OR_EXPIRED`
- `BUDGET_PERCENT_INVALID`
- `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS`
- `TRANSACTION_NOT_FOUND`
- `RECURRING_RULE_NOT_FOUND`

