# Backend API Reference

Base URL local: `http://localhost:3001/api/v1`

## Convencoes gerais

- Auth header:
  - `Authorization: Bearer <accessToken>`
- Conta ativa (endpoints financeiros):
  - `X-Account-Id: <accountId>` obrigatorio
  - o backend valida membership ativa do user nessa conta
- Content-Type:
  - `application/json`
- Refresh token:
  - cookie `HttpOnly` (`SameSite=Lax`; `Secure` em producao)
- Cache para endpoints account-scoped de stats/insights:
  - `Cache-Control: no-store`
  - `Vary: Authorization, X-Account-Id`

## Auth

### POST `/auth/register`
Cria utilizador, conta pessoal, membership owner, cria sessao e emite:
- `accessToken` curto no body
- refresh token no cookie `HttpOnly`

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
  "accessToken": "...",
  "user": {
    "id": "...",
    "email": "nuno@example.com",
    "name": "Nuno",
    "currency": "EUR",
    "preferences": {
      "themePalette": "ciano",
      "hideAmountsByDefault": false
    },
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
Le primeiro o cookie `HttpOnly`. Durante a transicao, continua a aceitar `refreshToken` no body.

Response `200`:
```json
{
  "accessToken": "..."
}
```

### POST `/auth/logout`
Revoga a sessao associada ao refresh token recebido por cookie ou body.

Request body opcional de compatibilidade:
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

### POST `/auth/tutorial/reset`
Auth obrigatoria. Repõe tutorial como não visto.

Response `200`: `UserProfile` atualizado (`tutorialSeenAt = null`).

### PATCH `/auth/me/profile`
Auth obrigatoria. Atualiza perfil e preferências.

`preferences.themePalette` aceita: `brisa|calma|aurora|terra|mare|amber|ciano`.
Compatibilidade: `ambar` e normalizado para `amber`.

Request (campos parciais):
```json
{
  "name": "Nuno",
  "currency": "USD",
  "preferences": {
    "themePalette": "calma",
    "hideAmountsByDefault": true
  }
}
```

Response `200`: `UserProfile` atualizado.

### PATCH `/auth/me/email`
Auth obrigatoria.

Request:
```json
{
  "currentPassword": "secret123",
  "newEmail": "novo@example.com"
}
```

Response `200`: `UserProfile` atualizado.

### PATCH `/auth/me/password`
Auth obrigatoria.

Request:
```json
{
  "currentPassword": "secret123",
  "newPassword": "newsecret12345"
}
```

Response `204`.
Efeito adicional: revoga todas as sessoes do user.

### GET `/auth/sessions`
Auth obrigatoria. Lista sessoes explicitas por dispositivo/login.

Response `200`:
```json
[
  {
    "jti": "...",
    "deviceInfo": "Mozilla/5.0 ...",
    "createdAt": "2026-03-12T10:00:00.000Z",
    "expiresAt": "2026-03-19T10:00:00.000Z",
    "revokedAt": null
  }
]
```

### DELETE `/auth/sessions/:jti`
Auth obrigatoria. Revoga uma sessão ativa.

Se a sessão já estiver revogada, o mesmo endpoint remove-a do histórico (cleanup).

Response `204`.

### DELETE `/auth/sessions/revoked`
Auth obrigatoria. Remove do histórico todas as sessões já revogadas.

Response `204`.

### POST `/auth/sessions/revoke-all`
Auth obrigatoria. Revoga todas as sessões do user e invalida refresh cookies em uso.

Response `204`.

### GET `/auth/export`
Auth obrigatoria. Exporta dados em JSON.

Response `200`:
```json
{
  "exportedAt": "2026-03-12T10:00:00.000Z",
  "user": {},
  "personalAccount": {
    "accountId": "...",
    "budgets": [],
    "transactions": [],
    "recurringRules": [],
    "incomeCategories": [],
    "statsSnapshots": []
  },
  "sharedMemberships": []
}
```

### DELETE `/auth/me`
Auth obrigatoria. Desativa conta e limpa PII.

Request:
```json
{
  "currentPassword": "secret123"
}
```

Response `204`.

## Transactions

### GET `/transactions?month=YYYY-MM`
Resumo mensal completo.

### GET `/transactions?month=YYYY-MM&type=expense&categoryId=...&origin=...&dateFrom=...&dateTo=...&cursor=...&limit=...`
Listagem paginada/filtravel de movimentos.

Response `200`:
```json
{
  "items": [],
  "totalCount": 12,
  "totalAmount": 341.4,
  "nextCursor": "....",
  "hasMore": true
}
```

### POST `/transactions`
Cria apenas lançamentos manuais. `origin` e `recurringRuleId` deixaram de ser aceites no contrato publico.

Para `expense`:
- requer budget valido no mes
- `categoryId` tem de existir no budget do mes
- categorias tecnicas/protegidas nao podem ser usadas manualmente

### DELETE `/budgets/:month/categories/:categoryId`
Falha com `422 BUDGET_CATEGORY_IN_USE` quando existirem transacoes ou recorrencias ativas a referenciar a categoria.

## Stats

- `includeInsight` passou a legado/deprecated em `/stats/semester` e `/stats/year`
- a UI pede insight IA via recurso dedicado `/stats/insights`
- abrir `/stats` nao dispara qualquer pedido de insight IA
- o entrypoint de interface e `POST /stats/insights`, iniciado apenas por acao explicita do utilizador
- `GET /stats/compare-budget` valida `from <= to` e rejeita ranges acima de 24 meses com `422`

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

## Income Categories

Requer auth + account context.

### GET `/income-categories`
Lista categorias de receita da conta ativa.

Response `200`:
```json
[
  {
    "id": "...",
    "accountId": "...",
    "name": "Outras receitas",
    "active": true,
    "isDefault": true,
    "createdAt": "2026-03-12T10:00:00.000Z",
    "updatedAt": "2026-03-12T10:00:00.000Z"
  }
]
```

### POST `/income-categories`
Cria nova categoria de receita.

Request:
```json
{
  "name": "Freelance"
}
```

Response `201`: `IncomeCategory`.

### PATCH `/income-categories/:id`
Atualiza nome e/ou estado ativo.

Request:
```json
{
  "name": "Bónus",
  "active": true
}
```

Notas:
- `active=false` nao e permitido para categoria default.
- nomes ativos duplicados por conta sao rejeitados.

Response `200`: `IncomeCategory`.

### DELETE `/income-categories/:id`
Soft-delete da categoria (marca `active=false`).

Nota: categoria default nao pode ser removida.

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
    { "id": "cat1", "name": "Despesas", "percent": 60, "colorSlot": 1, "kind": "expense" }
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
    { "id": "cat1", "name": "Despesas", "percent": 60, "kind": "expense" },
    { "id": "cat2", "name": "Lazer", "percent": 40, "kind": "expense" }
  ]
}
```

Notas:
- `totalBudget` e ignorado no backend (compatibilidade).
- `kind` e opcional na escrita; quando ausente o backend normaliza:
  - `Poupança/Poupanca/Investimento` => `reserve`
  - restantes => `expense`
- respostas devolvem `kind` e `colorSlot` normalizados.

### POST `/budgets/:month/categories`
Adiciona categoria.

Request:
```json
{
  "name": "Poupanca",
  "percent": 20,
  "kind": "reserve"
}
```

### DELETE `/budgets/:month/categories/:categoryId`
Remove categoria.

Nota:
- categorias tecnicas protegidas (ex: `fallback_recurring_expense`) nao podem ser removidas; backend responde `422 BUDGET_CATEGORY_PROTECTED`.

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
  "incomeTransactions": [
    {
      "id": "...",
      "accountId": "...",
      "userId": "...",
      "month": "2026-03",
      "date": "2026-03-01",
      "type": "income",
      "origin": "recurring",
      "recurringRuleId": "...",
      "description": "Salário",
      "amount": 1000,
      "categoryId": "...",
      "categoryResolution": "fallback",
      "requestedCategoryId": "...",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ],
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
- todas as transacoes expõem metadados de resolução de categoria:
  - `categoryResolution`: `direct | fallback`
  - `requestedCategoryId`: preenchido quando houve fallback.

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

Response `200`:
```json
[
  {
    "id": "...",
    "accountId": "...",
    "userId": "...",
    "type": "expense",
    "name": "Renda",
    "amount": 750,
    "dayOfMonth": 1,
    "categoryId": "hab",
    "startMonth": "2026-01",
    "active": true,
    "lastGenerationAt": "2026-03-15T00:10:00.000Z",
    "lastGenerationStatus": "fallback",
    "pendingFallbackCount": 2
  }
]
```

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

Semantica:
- no mes atual, gera apenas regras vencidas (`dayOfMonth <= dia UTC atual`, com clamp para meses curtos),
- em meses passados, gera todas as regras ativas desse mes,
- em meses futuros, nao gera.

Response `200`:
```json
{
  "created": 3,
  "fallbackCreated": 1,
  "processedRules": 5
}
```

### POST `/recurring-rules/:id/reassign-category`
Reatribui categoria da regra para geracoes futuras.

Request:
```json
{
  "categoryId": "cat_casa",
  "migratePastFallbackTransactions": true
}
```

Response `200`:
```json
{
  "rule": {
    "id": "...",
    "accountId": "...",
    "userId": "...",
    "type": "expense",
    "name": "Renda",
    "amount": 750,
    "dayOfMonth": 1,
    "categoryId": "cat_casa",
    "startMonth": "2026-01",
    "active": true,
    "lastGenerationAt": "2026-03-15T00:10:00.000Z",
    "lastGenerationStatus": "fallback",
    "pendingFallbackCount": 0
  },
  "migratedTransactions": 4
}
```

## Stats

Requer auth + account context.

### GET `/stats/semester?endingMonth=YYYY-MM&forecastWindow=3|6`
- `endingMonth` opcional.
- `forecastWindow` opcional (`3` por default).
- devolve sempre snapshot base sem IA inline.

### GET `/stats/year?year=YYYY&forecastWindow=3|6`
- `year` opcional.
  - quando omitido, backend devolve janela movel dos ultimos 12 meses a terminar no mes UTC atual.
- `forecastWindow` opcional (`3` por default).
- devolve sempre snapshot base sem IA inline.

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
  "totalsBreakdown": {
    "consumption": 6200,
    "savings": 1800,
    "unallocated": 4000,
    "potentialSavings": 5800,
    "rates": {
      "savings": 15,
      "unallocated": 33.33,
      "potentialSavings": 48.33
    }
  },
  "trend": [
    { "month": "2026-01", "income": 2000, "expense": 1300, "balance": 700 }
  ],
  "budgetVsActual": [
    {
      "categoryId": "cat1",
      "categoryName": "Despesas",
      "categoryKind": "expense",
      "budgeted": 5000,
      "actual": 5200,
      "difference": -200
    }
  ],
  "categorySeries": [
    {
      "categoryId": "cat1",
      "categoryName": "Despesas",
      "categoryKind": "expense",
      "monthly": [
        { "month": "2026-01", "budgeted": 800, "actual": 850 }
      ]
    }
  ],
  "incomeByCategory": [
    {
      "categoryId": "inc_1",
      "categoryName": "Salário",
      "amount": 9800,
      "percent": 81.67
    }
  ],
  "incomeCategorySeries": [
    {
      "categoryId": "inc_1",
      "categoryName": "Salário",
      "monthly": [
        { "month": "2026-01", "amount": 1600 }
      ]
    }
  ],
  "forecast": {
    "projectedIncome": 2200,
    "projectedExpense": 1500,
    "projectedBalance": 700,
    "windowMonths": 3,
    "sampleSize": 3,
    "confidence": "high"
  },
}
```

Notas:
- `totalsBreakdown` e opcional (nao-breaking) e separa explicitamente:
  - `consumption`: soma de `actual` em categorias nao `reserve`;
  - `savings`: soma de `actual` em categorias `reserve`;
  - `unallocated`: `totalIncome - consumption - savings` (pode ser negativo);
  - `potentialSavings`: `savings + max(unallocated, 0)`;
  - `rates.*`: `value / totalIncome * 100` (se `totalIncome <= 0`, taxa = `0`).
- `categoryKind` ausente e tratado como `expense` no calculo de `consumption`.
- `includeInsight` pode continuar a ser aceite por compatibilidade, mas nao altera o payload.

### POST `/stats/insights`
Cria ou reutiliza um pedido de insight IA para o snapshot atual.

Uso esperado:
- iniciado por clique/acao explicita do utilizador na UI
- a rota pode devolver:
  - `200` com `status=ready` quando reutiliza insight atual
  - `202` com `status=pending` quando criou/reutilizou job assincrono
  - `202` com `status=failed` quando o estado persistido anterior ja esta indisponivel

Body:
```json
{
  "periodType": "semester",
  "forecastWindow": 3
}
```

Response `202` (`pending`) ou `200` (`ready`):
```json
{
  "id": "67db2d9e5f9e9b2b0d47ac10",
  "periodType": "semester",
  "periodKey": "2026-S1",
  "forecastWindow": 3,
  "status": "pending",
  "stale": false,
  "requestedAt": "2026-03-20T18:45:01.000Z",
  "generatedAt": null,
  "model": "gpt-4.1-mini",
  "report": null,
  "error": null
}
```

Regras:
- dedupe por `accountId + periodType + periodKey + forecastWindow + inputHash`
- se ja existir insight `ready` e nao `stale` para o mesmo snapshot, o backend devolve-o sem nova chamada ao provider
- se ja existir `pending` igual, o backend devolve esse pedido

### GET `/stats/insights/:id`
Devolve o estado atual de um pedido de insight IA (`pending | ready | failed`).

Uso esperado:
- polling apenas depois de `POST /stats/insights` devolver `pending`

### GET `/stats/insights/latest?periodType=semester|year&forecastWindow=3|6`
Devolve o insight mais recente do periodo pedido para a conta ativa.
- pode devolver `ready`, `failed` ou `pending`
- quando nao existe insight ainda, devolve `404 STATS_INSIGHT_NOT_FOUND`

Nota:
- endpoint auxiliar para integracoes/backoffice/debug
- nao faz parte do fluxo automatico da UI principal

Response `200` (`ready`):
```json
{
  "id": "67db2d9e5f9e9b2b0d47ac10",
  "periodType": "semester",
  "periodKey": "2026-S1",
  "forecastWindow": 3,
  "status": "ready",
  "stale": true,
  "requestedAt": "2026-03-20T18:45:01.000Z",
  "generatedAt": "2026-03-20T18:45:03.000Z",
  "model": "gpt-4.1-mini",
  "report": {
    "summary": "Despesas continua a ser a maior fonte de pressão no período.",
    "highlights": [
      {
        "title": "Consumo concentrado",
        "detail": "Despesas absorve a maior parte do orçamento disponível.",
        "severity": "warning"
      }
    ],
    "risks": [
      {
        "title": "Margem curta",
        "detail": "Uma subida adicional nesta categoria reduz rapidamente a margem mensal.",
        "severity": "warning"
      }
    ],
    "actions": [
      {
        "title": "Definir teto semanal",
        "detail": "Mantém um teto semanal nesta categoria para estabilizar a execução.",
        "priority": "high"
      }
    ],
    "categoryInsights": [
      {
        "categoryId": "cat1",
        "categoryAlias": "C1",
        "categoryKind": "expense",
        "categoryName": "Despesas",
        "title": "Maior pressão do período",
        "detail": "Despesas representa o maior desvio agregado neste período.",
        "action": "Acompanha esta categoria todas as semanas."
      }
    ],
    "confidence": "medium"
  },
  "error": null
}
```

### GET `/stats/compare-budget?from=YYYY-MM&to=YYYY-MM`
Compara budgeted vs actual no intervalo.

Response `200`:
```json
{
  "from": "2026-01",
  "to": "2026-06",
  "totals": {
    "budgeted": 8400,
    "actual": 8125.5,
    "difference": 274.5
  },
  "items": [
    {
      "categoryId": "cat1",
      "categoryName": "Despesas",
      "categoryKind": "expense",
      "budgeted": 5000,
      "actual": 5200,
      "difference": -200
    }
  ]
}
```

## Codigos de erro comuns

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `REFRESH_TOKEN_INVALID`
- `REFRESH_TOKEN_REVOKED`
- `ACCOUNT_DELETED`
- `CURRENT_PASSWORD_INVALID`
- `SESSION_NOT_FOUND`
- `ACCOUNT_ACCESS_DENIED`
- `ACCOUNT_ROLE_FORBIDDEN`
- `ACCOUNT_OWNER_REQUIRED`
- `LAST_OWNER_PROTECTION`
- `LAST_OWNER_CANNOT_LEAVE`
- `LAST_OWNER_CANNOT_DELETE_ACCOUNT`
- `PERSONAL_ACCOUNT_CANNOT_LEAVE`
- `INVITE_CODE_INVALID_OR_EXPIRED`
- `INCOME_CATEGORY_REQUIRED`
- `INCOME_CATEGORY_NOT_FOUND`
- `INCOME_CATEGORY_INACTIVE`
- `INCOME_CATEGORY_DEFAULT_PROTECTED`
- `INCOME_CATEGORY_NAME_ALREADY_USED`
- `BUDGET_PERCENT_INVALID`
- `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS`
- `SOURCE_BUDGET_NOT_FOUND`
- `TRANSACTION_NOT_FOUND`
- `RECURRING_RULE_NOT_FOUND`
