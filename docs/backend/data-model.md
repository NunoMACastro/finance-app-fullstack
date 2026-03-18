# Backend Modelo de Dados (MongoDB)

## Colecoes

- `users`
- `accounts`
- `accountmemberships`
- `accountinvitecodes`
- `budgets`
- `transactions`
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
- `preferences.themePalette` (enum: `brisa|calma|aurora|terra`, default `brisa`)
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
- Dados financeiros sao lidos/escritos por `accountId`.
- `userId` em dados financeiros nao e criterio de autorizacao.
