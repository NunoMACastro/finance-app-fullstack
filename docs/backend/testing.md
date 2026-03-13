# Backend Testes

## Stack de testes

- Vitest
- Supertest
- MongoDB Memory Server (integration)

## Comandos

```bash
cd backend
npm run test:unit
npm run test:integration
npm run test
```

`npm run test` executa unit + integration.

## Estrutura atual

### Unit tests (`src/tests/unit`)

- `budget-validation.test.ts`
  - valida `isBudgetReady`
  - valida percentagens de budget (100, <100, >100, sem categorias)
- `month-utc.test.ts`
  - garante comportamento UTC em fronteiras de mes
- `stats-forecast.test.ts`
  - valida calculo de forecast

### Integration tests (`src/tests/integration`)

- `auth-flow.test.ts`
  - register/login/me/tutorial
- `accounts-flow.test.ts`
  - create account, invite, join, roles, leave/remocao
- `budget-transactions-flow.test.ts`
  - gating de lancamentos manuais por budget, sincronizacao de totalBudget
- `income-categories-flow.test.ts`
  - categorias default, regras de inativacao e validacao em incomes
- `profile-flow.test.ts`
  - profile/self-service (perfil, seguranca, sessoes, export, delete account)
- `stats-category-series.test.ts`
  - consistencia de `categorySeries`

## Boas praticas para novos testes

- Preferir naming explicito em formato:
  - `should_<expected_behavior>_when_<condition>`
- Testar contratos publicos (HTTP + payloads) em integracao.
- Testar regras puras em unit (funcoes sem I/O).
- Evitar dependencias entre testes.
- Garantir cleanup de DB em integracao.

## Matriz minima recomendada (manter)

- auth:
  - login invalido
  - refresh token revogado
- accounts:
  - bloqueio de ultimo owner
  - roles e autorizacao
- budgets:
  - `totalBudget` derivado de incomes
  - validacao de percentagens
- transactions:
  - bloqueio manual sem budget
  - sync de budget ao criar/editar/apagar income
- stats:
  - tendencia e budgetVsActual deterministas
  - categorySeries coerente por mes

## Execucao em CI

A pipeline (`.github/workflows/ci.yml`) corre:
- build backend
- unit tests
- integration tests

Qualquer falha bloqueia merge.
