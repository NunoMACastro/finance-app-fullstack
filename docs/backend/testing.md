# Backend Testes

Guia central de execucao (backend + frontend + E2E): [`../testing.md`](../testing.md)

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
- `stats-insight.test.ts`
  - valida anonimização de payload para IA
  - valida parsing do output estruturado
  - valida cache key, TTL e dedupe in-flight
- `stats-totals-breakdown.test.ts`
  - valida calculo de `totalsBreakdown` (consumption/savings/unallocated/potentialSavings)
  - valida taxas quando `totalIncome <= 0`
- `recurring-due-date.test.ts`
  - valida semantica de vencimento (mes passado/atual/futuro)
  - valida clamp de dia para meses curtos
- `auth-validators.test.ts`
  - valida enum de temas suportados no profile
  - valida normalizacao `ambar -> amber`
  - valida rejeicao de valores invalidos

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
- `stats-insight-fallback.test.ts`
  - garante que `/stats/semester` continua `200` sem `OPENAI_API_KEY`
- `recurring-fallback-flow.test.ts`
  - fallback automatico em recorrencias (`income` e `expense`)
  - categoria tecnica protegida de fallback em budget
  - reatribuicao de categoria com migracao opcional de historico fallback

Harness partilhado:
- `src/tests/integration/harness.ts` centraliza bootstrap de MongoDB Memory ReplSet, env de teste e `createApp()`.
- limpeza entre testes via `beforeEach` (deleteMany em todas as colecoes).
- `npm run test:integration` usa `vitest.integration.config.ts` (`fileParallelism=false`, `isolate=false`, `hook/test timeout=30s`).
- rate limits ficam elevadas no modo teste para evitar falso negativo entre suites.

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
  - totalsBreakdown coerente com totals

## Execucao em CI

A pipeline (`.github/workflows/ci.yml`) corre:
- build backend
- unit tests
- integration tests

Qualquer falha bloqueia merge.
