# Modelo de Dominio e Dados

## Entidades nucleares

### User
Representa identidade/autenticacao.
Campos chave:
- `email` (unico)
- `passwordHash`
- `profile` (`name`, `currency`)
- `preferences` (`themePalette`, `hideAmountsByDefault`)
- `tutorialSeenAt`
- `status` (`active|deleted`)
- `deletedAt` (nullable)
- `personalAccountId` (obrigatorio)

### Account
Workspace financeiro.
Tipos:
- `personal`: conta individual imutavel por user
- `shared`: conta partilhada entre membros

Campos chave:
- `name`
- `type`
- `createdByUserId`

### AccountMembership
Relacao user <-> account.
Campos chave:
- `accountId`
- `userId`
- `role`: `owner|editor|viewer`
- `status`: `active|inactive`
- `leftAt`

Invariantes:
- indice unico `(accountId, userId)`
- nao pode existir conta partilhada sem pelo menos 1 owner ativo

### AccountInviteCode
Convites para contas partilhadas.
Campos chave:
- `accountId`
- `codeHash`
- `expiresAt`
- `revokedAt`
- `createdByUserId`

Regras:
- codigo expira em 7 dias
- gerar novo codigo revoga codigos ativos anteriores

### Budget (mensal)
Orcamento por mes e conta.
Campos chave:
- `accountId`
- `month` (`YYYY-MM`)
- `totalBudget` (derivado de receitas)
- `categories[]` (`id`, `name`, `percent`)

Invariantes:
- unico por `(accountId, month)`
- `isReady` (calculado):
  - `categories.length >= 1`
  - soma percentagens = 100 (tolerancia 0.01)

### Transaction
Lancamento financeiro.
Campos chave:
- `accountId`
- `month`
- `date`
- `type`: `income|expense`
- `origin`: `manual|recurring`
- `recurringRuleId` (se recorrente)
- `description`, `amount`, `categoryId`

Regras:
- `month` deriva de `date` em UTC
- `manual` exige budget valido no mes alvo
- transacoes `income` sincronizam `budget.totalBudget`

### RecurringRule
Regra de geracao automatica de transacoes.
Campos chave:
- `accountId`
- `type`, `name`, `amount`, `dayOfMonth`, `categoryId`
- `startMonth`, `endMonth`, `active`

### IncomeCategory
Categoria de classificacao de receitas.
Campos chave:
- `accountId`
- `name`, `nameNormalized`
- `active`
- `isDefault`

Regras:
- existe 1 categoria default por conta
- default nao pode ser removida nem desativada
- nomes ativos sao unicos por conta

### StatsSnapshot
Materializacao de stats agregadas.
Campos chave:
- `accountId`
- `periodType`: `semester|year`
- `periodKey`
- `payload`

Indice unico: `(accountId, periodType, periodKey)`

## Relacoes principais

- `User 1 -> 1 personal Account`
- `User N <-> N Account` via `AccountMembership`
- `Account 1 -> N Budget/Transaction/RecurringRule/IncomeCategory/StatsSnapshot`
- `RecurringRule 1 -> N Transaction (origin=recurring)`

## Scoping funcional

Todos os dados financeiros usam `accountId` como fronteira de autorizacao.
`userId` nos documentos financeiros e metadado de autoria/historico.

## Semantica temporal

- Month key: `YYYY-MM`
- Backend usa UTC para calcular mes (`monthFromDate`) e dia seguro em recorrencias (`monthToDate`)

## Contratos criticos

- `SaveBudgetDto.totalBudget` existe por compatibilidade, mas e ignorado no backend.
- `MonthBudget.totalBudget` e sempre recalculado por soma de receitas do mes.
- Stats calculam budgeted por categoria com base em income real do mes.
- Transacoes `income` exigem `IncomeCategory` ativa da conta.
