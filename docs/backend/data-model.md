# Backend Modelo de Dados (MongoDB)

## Colecoes

- `users`
- `accounts`
- `accountmemberships`
- `accountinvitecodes`
- `budgets`
- `transactions`
- `authsessions`
- `incomecategories`
- `recurringrules`
- `statssnapshots`
- `refreshtokens`

## users

Campos chave:
- `email` (unique, lowercase, index)
- `passwordHash`
- `profile.name`
- `profile.currency` (default `EUR`)
- `preferences.themePalette` (enum: `brisa|calma|aurora|terra|mare|amber|ciano`, default `ciano`)
- `preferences.hideAmountsByDefault` (default `false`)
- `tutorialSeenAt` (nullable)
- `status` (`active|deleted`, default `active`, index)
- `deletedAt` (nullable)
- `personalAccountId` (required, index)

## accounts

Campos chave:
- `name`
- `type` (`personal|shared`, index)
- `createdByUserId` (index)
- `activeOwnerCount` (contador operacional de owners ativos)
- `activeInviteCodeId` (nullable, ponteiro para o convite actualmente activo em contas partilhadas)

Indices:
- unico parcial: `{ createdByUserId: 1, type: 1 }` com `type="personal"`

## accountmemberships

Campos chave:
- `accountId` (index)
- `userId` (index)
- `role` (`owner|editor|viewer`, index)
- `status` (`active|inactive`, index)
- `leftAt` (nullable)

Indices:
- unico `{ accountId: 1, userId: 1 }`
- secundario `{ userId: 1, status: 1 }`

## accountinvitecodes

Campos chave:
- `accountId` (index)
- `codeHash` (index)
- `expiresAt` (index)
- `revokedAt` (index, nullable)
- `createdByUserId` (index)

Semântica:
- `revokedAt` marca histórico/auditoria do código anterior quando ocorre rotação.

Indice:
- `{ accountId: 1, revokedAt: 1, expiresAt: 1 }`

## budgets

Campos chave:
- `accountId` (index)
- `userId` (autor da ultima mutacao)
- `month` (`YYYY-MM`, index)
- `totalBudget` (derivado)
- `categories[]`
  - `id`
  - `name`
  - `percent`
  - `colorSlot` (1..9)
  - `kind` (`expense|reserve`)

Invariantes de categoria de budget:
- `colorSlot` e normalizado para slot valido de tema (1..9).
- `kind` e normalizado para `expense` ou `reserve`.
- payloads legados sem `colorSlot`/`kind` continuam aceites via normalizacao lazy.

Indice unico:
- `{ accountId: 1, month: 1 }`

## transactions

Campos chave:
- `accountId` (index)
- `userId`
- `month` (index)
- `date`
- `type` (`income|expense`)
- `origin` (`manual|recurring`)
- `recurringRuleId` (nullable, index)
- `description`
- `amount`
- `categoryId` (index)
- `categoryResolution` (`direct|fallback`, default `direct`)
- `requestedCategoryId` (nullable, preenchido quando houve fallback)

Indices:
- `{ accountId: 1, month: 1 }`
- `{ accountId: 1, month: 1, date: -1, _id: -1 }` (listagem paginada/sort por data)
- `{ accountId: 1, month: 1, type: 1, categoryId: 1, origin: 1, date: -1, _id: -1 }` (filtros compostos em listagens)
- `{ accountId: 1, recurringRuleId: 1, origin: 1, categoryResolution: 1 }` (contagens/queries de fallback recorrente)
- unico parcial `{ accountId: 1, recurringRuleId: 1, month: 1 }` quando `recurringRuleId` existe

## incomecategories

Campos chave:
- `accountId` (index)
- `name`
- `nameNormalized` (index)
- `active` (default `true`, index)
- `isDefault` (default `false`, index)

Indices:
- unico parcial `{ accountId: 1, nameNormalized: 1 }` com `active=true`
- unico parcial `{ accountId: 1, isDefault: 1 }` com `isDefault=true`

## recurringrules

Campos chave:
- `accountId` (index)
- `userId`
- `type`
- `name`
- `amount`
- `dayOfMonth` (1..31)
- `categoryId` (index)
- `startMonth` (index)
- `endMonth` (nullable)
- `active` (index)
- `lastGenerationAt` (nullable)
- `lastGenerationStatus` (`ok|fallback`, nullable)

Indice:
- `{ accountId: 1, active: 1, startMonth: 1 }`

## statssnapshots

Campos chave:
- `accountId` (index)
- `userId` (nullable, metadado legado)
- `periodType` (`semester|year`, index)
- `periodKey` (index)
- `payload` (mixed)

Indice unico:
- `{ accountId: 1, periodType: 1, periodKey: 1 }`

## statsinsights

Campos chave:
- `accountId` (index)
- `requestedByUserId` (index)
- `periodType` (`semester|year`, index)
- `periodKey` (index)
- `forecastWindow` (`3|6`)
- `inputHash` (index)
- `status` (`pending|ready|failed`, index)
- `stale` (index)
- `processingOwnerId` (nullable, index)
- `processingLeaseUntil` (nullable, index)

Indices:
- `{ accountId: 1, periodType: 1, periodKey: 1, forecastWindow: 1, createdAt: -1 }`
- `{ accountId: 1, periodType: 1, periodKey: 1, forecastWindow: 1, inputHash: 1, stale: 1, status: 1, generatedAt: -1, createdAt: -1 }`
- unico parcial `{ accountId: 1, periodType: 1, periodKey: 1, forecastWindow: 1, inputHash: 1, stale: 1, status: 1 }` com filtro `stale=false` e `status=pending`

## authsessions

Campos chave:
- `sid` (unique, index)
- `userId` (index)
- `status` (`active|revoked|compromised`, index)
- `revokedAt` (nullable)
- `compromisedAt` (nullable)
- `currentRefreshJti` (nullable)
- `expiresAt` (index)
- `lastSeenAt` (nullable)
- `deviceInfo` (nullable)

Invariantes operacionais:
- `currentRefreshJti` e a fonte de verdade da rotação ativa da sessao.
- `POST /auth/refresh` so avanca a sessao quando o `jti` apresentado ainda coincide com `currentRefreshJti`.
- `status != active` implica que a sessao nao pode refrescar.
- replay/concurrency sao resolvidos por CAS transacional sobre `currentRefreshJti`.
- A API publica de sessoes expõe `sid` como identificador canonico; `jti` em `GET /auth/sessions` e apenas alias legado do mesmo valor durante a transicao.

## refreshtokens

Campos chave:
- `userId` (index)
- `jti` (index)
- `tokenHash`
- `expiresAt` (index)
- `revokedAt` (nullable)
- `replacedByJti` (nullable)
- `deviceInfo` (nullable)

## Invariantes operacionais

- Todo `user` deve referenciar `personalAccountId` valido.
- Toda conta pessoal deve ter membership ativa owner do proprio user.
- `activeOwnerCount` e mantido transacionalmente a partir das memberships ativas `owner`; reativacoes por convite precisam reconciliar esse contador antes do commit.
- `activeInviteCodeId` aponta para o convite actualmente válido; joins usam esse campo como gate operacional.
- Dados financeiros sao lidos/escritos por `accountId`.
- `userId` em dados financeiros nao e criterio de autorizacao.
