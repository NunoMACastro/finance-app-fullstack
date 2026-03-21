# Deep Audit Report

## 1. Executive Summary

- Visão geral objetiva: a aplicação tem boa base modular e vários guardrails úteis, mas está atualmente abaixo de um baseline de produção robusta por falhas críticas de integridade (`totalBudget`), problemas de consistência FE multi-conta, drift documental relevante e gaps de supply-chain/operação.
- Findings totais: **34**
- Distribuição por severidade:
    - Critical: **0**
    - High: **7**
    - Medium: **21**
    - Low: **5**
    - Info: **1**
- Top riscos:
    - Invariante funcional crítica quebrada: sincronização de `totalBudget` após mutações de receitas está efetivamente desativada.
    - Build backend quebrado em `stats/service.ts`, bloqueando pipeline de qualidade.
    - Fluxos FE de `Stats` e `Recorrências` não recarregam de forma segura ao trocar conta ativa.
    - Divergência entre SSOT e implementação em contratos de account context/scheduler.
    - Vulnerabilidades conhecidas em dependências frontend (`flatted`, `vite`).
- Avaliação global curta: **MVP evoluído com qualidade parcial; não pronto para produção financeira multi-conta sem remediação prioritária.**

## 1.1 Update de Remediação (2026-03-21)

- Escopo executado nesta vaga: `F-002` a `F-034`, com excecao de `F-001` (ja corrigido) e `F-031` (risco aceite em ambiente dev).
- Resultado global:
  - `Resolved`: `F-002..F-030`, `F-032..F-034`
  - `Accepted risk`: `F-031`
- Gates finais validados:
  - Backend: `npm run build`, `npm run test:unit`, `npm run test:integration`
  - Frontend: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`

### Matriz Fase 0 (Likely / Needs confirmation)

| Finding | Resultado Fase 0 | Estado final |
| --- | --- | --- |
| F-012 | Confirmed | Resolved (gate `npm audit signatures` em CI) |
| F-016 | Confirmed | Resolved (validacao de ultimo owner dentro da transacao) |
| F-017 | Confirmed | Resolved (lease scheduler com heartbeat/renovacao) |
| F-018 | Confirmed | Resolved (ObjectId validation + testes de integracao) |
| F-025 | Confirmed | Resolved (indices compostos para listagem/sort) |
| F-026 | Confirmed | Resolved (indice composto para fallback recorrente) |
| F-028 | Confirmed | Resolved (rate-limit auth por IP+email) |
| F-032 | Confirmed | Resolved (dedupe/lease de insight multi-instancia) |
| F-034 | Confirmed | Resolved (readiness sem false-negative por permissao admin) |
| F-033 | Already fixed after F-001 | Resolved |

### Matriz de Fecho (F-002..F-034)

| ID | Fase | Estado |
| --- | --- | --- |
| F-002 | Fase 1 | Resolved |
| F-003 | Fase 1 (docs) | Resolved |
| F-004 | Fase 3 (+docs) | Resolved |
| F-005 | Fase 1 | Resolved |
| F-006 | Fase 1 | Resolved |
| F-007 | Fase 2 | Resolved |
| F-008 | Fase 2 | Resolved |
| F-009 | Fase 2 | Resolved |
| F-010 | Fase 2 | Resolved |
| F-011 | Fase 6 | Resolved |
| F-012 | Fase 6 | Resolved |
| F-013 | Fase 3 | Resolved |
| F-014 | Fase 3 | Resolved |
| F-015 | Fase 3 | Resolved |
| F-016 | Fase 4 | Resolved |
| F-017 | Fase 4 | Resolved |
| F-018 | Fase 3 | Resolved |
| F-019 | Fase 3 | Resolved |
| F-020 | Fase 2 | Resolved |
| F-021 | Fase 6 (docs) | Resolved |
| F-022 | Fase 4 (docs) | Resolved |
| F-023 | Fase 1 (docs) | Resolved |
| F-024 | Fase 1 | Resolved |
| F-025 | Fase 5 | Resolved |
| F-026 | Fase 5 | Resolved |
| F-027 | Fase 3 | Resolved |
| F-028 | Fase 3 | Resolved |
| F-029 | Fase 6 | Resolved |
| F-030 | Fase 6 | Resolved |
| F-031 | Fora de escopo (decisao) | Accepted risk |
| F-032 | Fase 4 | Resolved |
| F-033 | Fase 0 (revalidacao) | Resolved |
| F-034 | Fase 3 | Resolved |

## 2. Scope and Method

### O que foi lido (SSOT obrigatório)

- `README.md`
- `README_AGENTS.md`
- `docs/README.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/domain-model.md`
- `docs/backend/README.md`
- `docs/backend/setup-config.md`
- `docs/backend/api-reference.md`
- `docs/backend/business-rules.md`
- `docs/backend/data-model.md`
- `docs/backend/operations.md`
- `docs/backend/testing.md`
- `docs/frontend/README.md`
- `docs/frontend/setup-config.md`
- `docs/frontend/architecture.md`
- `docs/frontend/screens-flows.md`
- `docs/frontend/state-and-api.md`
- `docs/frontend/quality-testing.md`
- `docs/frontend/ui-v3-spec.md`
- `docs/frontend/design-tokens.md`
- `docs/operations/deployment.md`
- `docs/operations/ci-cd.md`
- `docs/operations/runbooks.md`

### Mapeamento docs -> código

- Mapeamento direto (sem necessidade de equivalência por renome): a estrutura real corresponde à estrutura pedida.
- Documento adicional relevante lido: `docs/testing.md`.

### O que foi executado

Backend:

- `npm run build` -> **falha** (TS2322 / TS2345 em `src/modules/stats/service.ts`)
- `npm run test:unit` -> **passa** (31 testes)
- `npm run test:integration` -> **falha por limitação de ambiente sandbox** (`listen EPERM 0.0.0.0` em mongodb-memory-server)
- `npm audit --package-lock-only` (com rede) -> **0 vulnerabilidades**

Frontend:

- `npm run typecheck` -> **passa**
- `npm run lint` -> **falha** (`no-unsafe-finally` em 2 ficheiros)
- `npm run check:tokens` -> **passa**
- `npm run check-theme-contract` -> **passa**
- `npm run test` -> **falha** (1 teste falhado em `category-movements-page.test.tsx` + warnings `act(...)`)
- `npm run build` -> **passa**
- `npm audit --package-lock-only` (com rede) -> **2 vulnerabilidades** (`flatted`, `vite`)

### Limitações do ambiente

- Testes de integração backend não executáveis no sandbox por restrição de bind/listen.
- `npm audit signatures` não ficou executado nesta ronda (aprovação não concluída), portanto não houve validação efetiva de provenance/assinaturas.

### Baseline usada para “estado da arte”

- OWASP ASVS 5.0
- OWASP API Security Top 10 (2023)
- RFC 8725 (JWT BCP)
- Security best practices oficiais de Express/Node.js/MongoDB
- Práticas modernas npm supply-chain (audit + signatures/provenance)

## 3. Findings Summary Table

| ID    | Severity | Confidence | Area             | Category             | Title                                                                                           | Evidence                                                                                                                                                                           | Short impact                                                  |
| ----- | -------- | ---------- | ---------------- | -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| F-001 | High     | High       | Backend          | Backend              | Build backend quebrado em `stats/service.ts`                                                    | `npm run build` (backend), `backend/src/modules/stats/service.ts:215`, `backend/src/modules/stats/service.ts:350`                                                                  | Pipeline e release bloqueados                                 |
| F-002 | High     | High       | Backend          | Data Integrity       | `syncBudgetTotalFromTransactions` está vazio (no-op)                                            | `backend/src/modules/budgets/service.ts:511-514` + chamadas em `transactions/recurring`                                                                                            | Invariante `totalBudget` não sincroniza em mutações de income |
| F-003 | Medium   | High       | Docs/Backend     | Docs Drift           | SSOT diz que sync ocorre em create/update/delete income, código não cumpre                      | `docs/backend/business-rules.md:76-79`, `README_AGENTS.md:65-66`, `backend/src/modules/budgets/service.ts:511-514`                                                                 | Drift funcional e risco de decisões erradas                   |
| F-004 | Medium   | High       | API/AuthZ        | Docs Drift           | `X-Account-Id` opcional vs obrigatório em docs                                                  | `docs/backend/business-rules.md:9`, `README_AGENTS.md:48`, `docs/backend/api-reference.md:10`, `backend/src/middleware/account-context.ts:30-33`                                   | Integrações quebram por contrato ambíguo                      |
| F-005 | High     | High       | Frontend         | Frontend             | `StatsPage` não reage à troca de conta ativa                                                    | `frontend/src/app/components/stats-page.tsx:80`, `frontend/src/app/components/stats-page.tsx:146`, `docs/frontend/screens-flows.md:242`                                            | UI pode mostrar dados da conta errada                         |
| F-006 | High     | High       | Frontend         | Frontend             | `RecurringRulesPage` não depende de conta ativa para recarregar                                 | `frontend/src/app/components/recurring-rules-page.tsx:104`, `frontend/src/app/components/recurring-rules-page.tsx:152`                                                             | Stale state e risco de ação em contexto errado                |
| F-007 | Medium   | High       | Frontend         | Validation           | `MonthPage` usa calendário local em pontos críticos de mês                                      | `frontend/src/app/components/month-page.tsx:69-75`, `frontend/src/app/components/month-page.tsx:292-295`                                                                           | Divergência UTC em fronteiras de mês                          |
| F-008 | Medium   | High       | Frontend         | Validation           | `RecurringRulesPage` calcula mês corrente por timezone local                                    | `frontend/src/app/components/recurring-rules-page.tsx:25-28`                                                                                                                       | Possível drift entre FE e BE em UTC                           |
| F-009 | Medium   | High       | Frontend         | Maintainability      | Lint falha (`no-unsafe-finally`) em 2 ficheiros                                                 | `frontend/src/app/components/month-page.tsx:324`, `frontend/src/app/components/category-movements-page.tsx:152`, `npm run lint`                                                    | Código com anti-pattern e gate de qualidade vermelho          |
| F-010 | Medium   | High       | Testing          | Testing              | Suite frontend falha (1 teste) + warnings `act(...)`                                            | `frontend/src/app/components/category-movements-page.test.tsx:135`, output `npm run test`                                                                                          | Regressões podem passar despercebidas                         |
| F-011 | Medium   | High       | Supply Chain     | Security             | Vulnerabilidades npm no frontend (`flatted`, `vite`)                                            | output `npm audit --package-lock-only` (frontend)                                                                                                                                  | Exposição a CVEs conhecidas                                   |
| F-012 | Medium   | Medium     | Supply Chain     | CI/CD                | Sem gate de signatures/provenance na pipeline                                                   | `.github/workflows/ci.yml`, `docs/operations/ci-cd.md:62`                                                                                                                          | Integridade da cadeia de dependências incompleta              |
| F-013 | Medium   | High       | Backend/Ops      | Security             | `/metrics` pode ficar público sem token                                                         | `backend/src/app.ts:107-114`, `backend/src/config/env.ts:22`, `backend/src/config/env.ts:83`                                                                                       | Exposição de telemetria a terceiros                           |
| F-014 | Medium   | High       | Operations       | Backend              | Sem graceful shutdown explícito                                                                 | `backend/src/server.ts:7-16`                                                                                                                                                       | Risco de cortes abruptos e perda de requests                  |
| F-015 | Medium   | Medium     | Security         | Security             | Logging sem política de redaction estruturada                                                   | `backend/src/config/logger.ts:4-16`, `backend/src/app.ts:54`                                                                                                                       | Possível leak de dados sensíveis em logs                      |
| F-016 | High     | Medium     | Auth/Accounts    | Concurrency          | `deleteMe` valida “último owner” fora da transação                                              | `backend/src/modules/auth/service.ts:759-766`, `backend/src/modules/auth/service.ts:777-807`                                                                                       | Corrida pode violar invariante de owner                       |
| F-017 | Medium   | Medium     | Scheduler        | Concurrency          | Lease de scheduler sem heartbeat/renovação                                                      | `backend/src/jobs/scheduler.ts:10`, `backend/src/jobs/scheduler.ts:14`, `backend/src/jobs/scheduler.ts:72-76`                                                                      | Risco de execução concorrente em jobs longos                  |
| F-018 | Medium   | Medium     | API              | Validation           | Params de ID não validados como ObjectId em transações/recorrências                             | `backend/src/modules/transactions/validators.ts:41-43`, `backend/src/modules/recurring/validators.ts:5-7`                                                                          | Erros 500/CastError possíveis                                 |
| F-019 | Low      | Medium     | API              | API Contract         | Schemas não estritos (campos extra silenciosamente ignorados)                                   | Ex.: `backend/src/modules/transactions/validators.ts:20-27`, `backend/src/modules/budgets/validators.ts:27-30`                                                                     | Contrato ambíguo e debugging difícil                          |
| F-020 | Medium   | High       | FE<->BE Contract | API Contract         | Password mínima diverge (FE=6, BE=10)                                                           | `frontend/src/app/components/auth-page.tsx:80-83`, `backend/src/modules/auth/validators.ts:11`                                                                                     | UX quebrada e erros evitáveis                                 |
| F-021 | Medium   | High       | Docs Drift       | Docs Drift           | Arquitetura diz FE guarda refresh token; implementação usa cookie HttpOnly                      | `docs/architecture/system-overview.md:29`, `frontend/src/app/lib/token-store.ts:1-5`, `backend/src/lib/cookies.ts:27-33`                                                           | Modelo de ameaça/documentação incoerente                      |
| F-022 | Medium   | High       | Docs Drift       | Docs Drift           | Arquitetura diz scheduler materializa snapshots; código não faz                                 | `docs/architecture/system-overview.md:50`, `docs/backend/operations.md:26`, `backend/src/jobs/scheduler.ts:82-91`                                                                  | Expectativas operacionais erradas                             |
| F-023 | Medium   | High       | Docs Drift       | Docs Drift           | Docs FE dizem Month/Stats robustos na troca de conta; implementação falha em Stats/Recorrências | `docs/frontend/state-and-api.md:194`, `frontend/src/app/components/stats-page.tsx:115-157`, `frontend/src/app/components/recurring-rules-page.tsx:132-156`                         | Falsa sensação de robustez                                    |
| F-024 | High     | High       | Business Rules   | Data Integrity       | Regra recorrente pode ser criada com categoria técnica de fallback                              | `frontend/src/app/components/recurring-rules-page.tsx:158-159`, `frontend/src/app/components/recurring-rules-page.tsx:427-429`, `backend/src/modules/recurring/service.ts:121-140` | Categoria técnica pode entrar em fluxo normal                 |
| F-025 | Medium   | Medium     | Database         | Performance          | Índice insuficiente para listagem paginada/sort de transações                                   | `backend/src/models/transaction.model.ts:73-77`, `backend/src/modules/transactions/service.ts:245-247`                                                                             | Risco de degradação com crescimento da coleção                |
| F-026 | Medium   | Medium     | Database         | Performance          | Queries de fallback recorrente sem índice composto dedicado                                     | `backend/src/modules/recurring/service.ts:143-148`, `backend/src/modules/recurring/service.ts:356-362`, `backend/src/models/transaction.model.ts:73-77`                            | Scans desnecessários em operações de manutenção               |
| F-027 | Low      | Medium     | Security         | State-of-the-Art Gap | Default `CORS_ORIGIN='*'` fora de produção é frágil                                             | `backend/src/config/env.ts:60`, `backend/src/app.ts:68-74`                                                                                                                         | Defaults inseguros/ambíguos em ambientes intermédios          |
| F-028 | Low      | Medium     | Security         | State-of-the-Art Gap | Rate-limit auth sem dimensão por utilizador/email                                               | `backend/src/modules/auth/routes.ts:24-43`                                                                                                                                         | Menor resistência a brute force distribuído                   |
| F-029 | Low      | High       | CI/CD            | Testing              | E2E Playwright não corre em CI por defeito                                                      | `docs/operations/ci-cd.md:49`, `.github/workflows/ci.yml`                                                                                                                          | Falta cobertura de regressões de fluxo real                   |
| F-030 | Medium   | Medium     | CI/CD            | State-of-the-Art Gap | Pipeline sem SAST/CodeQL/Semgrep                                                                | `.github/workflows/ci.yml`                                                                                                                                                         | Superfícies de risco não analisadas automaticamente           |
| F-031 | Info     | Medium     | Security         | Other                | Segredos reais presentes em `.env` local do workspace                                           | `backend/.env:3`, `backend/.env:12`, `git ls-files backend/.env`                                                                                                                   | Risco operacional local (não confirmado em histórico git)     |
| F-032 | Medium   | Medium     | Stats            | Concurrency          | Dedup de jobs de insight é apenas em memória por instância                                      | `backend/src/modules/stats/service.ts:134`, `backend/src/modules/stats/service.ts:515-594`                                                                                         | Multi-instância pode duplicar chamadas ao provider            |
| F-033 | Medium   | High       | Backend          | API Contract         | Erros de tipagem `colorSlot` indicam contrato BE/FE inconsistente (nullability)                 | `backend/src/modules/stats/service.ts:215`, `backend/src/modules/stats/service.ts:350`, output build                                                                               | Drift de tipos e risco de regressões                          |
| F-034 | Low      | Medium     | Operations       | Other                | Readiness depende de comandos admin (`hello`), sensível a permissões                            | `backend/src/config/db.ts:29-36`                                                                                                                                                   | Falsos negativos em ambientes com perfis restritos            |

## 4. Findings (DETALHADO E COMPLETO)

### [F-001] [High] [Backend] Build backend quebrado em stats/service

- Status: Confirmed
- Category: Backend
- Impact: bloqueia build, CI e deploy confiável.
- Why this matters: com build quebrado, qualquer mudança fica sem garantia de integridade de tipos.
- Evidence:
    - `backend/src/modules/stats/service.ts:215`
    - `backend/src/modules/stats/service.ts:350`
    - output `npm run build` (TS2322 / TS2345)
- Expected / state-of-the-art behavior:
    - Build TypeScript limpo em pipeline.
- Current behavior:
    - Erros de nullability em `colorSlot` impedem compilação.
- Risk scenario:
    - Hotfixes urgentes ficam bloqueados; risco de bypass de quality gates.
- Recommendation direction (sem implementar):
    - Corrigir contrato de tipos `colorSlot` (`number | undefined` vs `number | null | undefined`) de ponta a ponta (DTO/model/service).
- Confidence:
    - High

### [F-002] [High] [Backend] syncBudgetTotalFromTransactions está vazio (no-op)

- Status: Confirmed
- Category: Data Integrity
- Impact: `totalBudget` não é sincronizado em mutações de receitas (create/update/delete/reassign/generate).
- Why this matters: quebra invariante de negócio central e pode induzir decisões financeiras erradas.
- Evidence:
    - `backend/src/modules/budgets/service.ts:511-514`
    - `backend/src/modules/transactions/service.ts:311-313`
    - `backend/src/modules/transactions/service.ts:390-392`
    - `backend/src/modules/transactions/service.ts:405-407`
    - `backend/src/modules/recurring/service.ts:376-379`
    - `backend/src/modules/recurring/service.ts:451-453`
- Expected / state-of-the-art behavior:
    - Função efetiva de sincronização transacional/consistente de totais derivados.
- Current behavior:
    - Função não executa lógica.
- Risk scenario:
    - Valores derivados ficam stale até leituras específicas, afetando UX e regras dependentes de estado.
- Recommendation direction (sem implementar):
    - Restaurar sincronização determinística em write-path, com cobertura de teste para casos cross-month.
- Confidence:
    - High

### [F-003] [Medium] [Docs/Backend] Drift: docs prometem sync em mutações de income

- Status: Confirmed
- Category: Docs Drift
- Impact: equipa e integradores tomam decisões com base em comportamento não real.
- Why this matters: drift em regra financeira crítica gera incidentes difíceis de diagnosticar.
- Evidence:
    - `docs/backend/business-rules.md:76-79`
    - `README_AGENTS.md:65-66`
    - `backend/src/modules/budgets/service.ts:511-514`
- Expected / state-of-the-art behavior:
    - SSOT alinhado com implementação em invariantes críticas.
- Current behavior:
    - SSOT diz “sincroniza”; código não sincroniza.
- Risk scenario:
    - testes/monitoring desenhados para a regra documentada não capturam o comportamento real.
- Recommendation direction (sem implementar):
    - Alinhar docs e implementação imediatamente; manter checklist de drift em PR.
- Confidence:
    - High

### [F-004] [Medium] [API/AuthZ] X-Account-Id opcional vs obrigatório

- Status: Confirmed
- Category: Docs Drift
- Impact: contratos API contraditórios criam erros de integração.
- Why this matters: account context é boundary de segurança multi-tenant.
- Evidence:
    - `docs/backend/business-rules.md:9`
    - `README_AGENTS.md:48`
    - `docs/backend/api-reference.md:10`
    - `backend/src/middleware/account-context.ts:30-33`
- Expected / state-of-the-art behavior:
    - Um contrato único e explícito para account header.
- Current behavior:
    - Parte da doc diz opcional (fallback), parte diz obrigatório; código financeiro usa obrigatório.
- Risk scenario:
    - clientes quebram com 422 inesperado ou assumem fallback inexistente.
- Recommendation direction (sem implementar):
    - Uniformizar contrato em toda a doc e exemplos de integração.
- Confidence:
    - High

### [F-005] [High] [Frontend] StatsPage não reage à troca de conta ativa

- Status: Confirmed
- Category: Frontend
- Impact: leitura potencialmente stale de outra conta.
- Why this matters: risco direto de confusão de dados multi-conta (tenant context).
- Evidence:
    - `frontend/src/app/components/stats-page.tsx:80`
    - `frontend/src/app/components/stats-page.tsx:146`
    - `frontend/src/app/components/layout.tsx:24-25`
    - `docs/frontend/screens-flows.md:242`
- Expected / state-of-the-art behavior:
    - troca de conta deve disparar reload imediato e invalidar requests antigos.
- Current behavior:
    - página não depende de `activeAccountId` e pode manter snapshot antigo.
- Risk scenario:
    - utilizador analisa conta A enquanto header já mostra conta B.
- Recommendation direction (sem implementar):
    - Ligar página ao contexto de conta ativa e invalidar estado/requestId na troca.
- Confidence:
    - High

### [F-006] [High] [Frontend] RecurringRulesPage não recarrega por conta ativa

- Status: Confirmed
- Category: Frontend
- Impact: lista/form de regras pode ficar em contexto errado após switch.
- Why this matters: operações de escrita em regras recorrentes são sensíveis.
- Evidence:
    - `frontend/src/app/components/recurring-rules-page.tsx:104`
    - `frontend/src/app/components/recurring-rules-page.tsx:132-156`
- Expected / state-of-the-art behavior:
    - invalidar dados e recarregar ao trocar `activeAccountId`.
- Current behavior:
    - `loadData` depende apenas de `currentMonth`.
- Risk scenario:
    - utilizador acredita editar regra da conta atual, mas UI vinha da conta anterior.
- Recommendation direction (sem implementar):
    - adicionar dependência de conta ativa + guardas anti-race na carga.
- Confidence:
    - High

### [F-007] [Medium] [Frontend] MonthPage usa calendário local para fronteiras mensais

- Status: Confirmed
- Category: Validation
- Impact: inconsistência de mês/dias remanescentes face ao backend UTC.
- Why this matters: mês é unidade funcional central da app.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:69-75`
    - `frontend/src/app/components/month-page.tsx:292-295`
    - `README_AGENTS.md:42`
- Expected / state-of-the-art behavior:
    - derivação de mês alinhada a UTC/documented contract.
- Current behavior:
    - derivação no FE usa `new Date()` local em partes críticas.
- Risk scenario:
    - em timezone limítrofe, FE e BE divergem no mês corrente.
- Recommendation direction (sem implementar):
    - consolidar helpers mensais UTC em todos os cálculos de mês.
- Confidence:
    - High

### [F-008] [Medium] [Frontend] RecurringRulesPage calcula mês atual em timezone local

- Status: Confirmed
- Category: Validation
- Impact: `startMonth` default pode divergir do backend UTC.
- Why this matters: regras recorrentes usam mês como boundary de geração.
- Evidence:
    - `frontend/src/app/components/recurring-rules-page.tsx:25-28`
    - `backend/src/lib/month.ts:13-15`
- Expected / state-of-the-art behavior:
    - default do mês no FE compatível com contrato UTC do BE.
- Current behavior:
    - usa `getFullYear()/getMonth()` local.
- Risk scenario:
    - regra criada no mês “errado” em fronteiras de dia/mês.
- Recommendation direction (sem implementar):
    - reutilizar helper UTC único no FE.
- Confidence:
    - High

### [F-009] [Medium] [Frontend] Lint gate falha por no-unsafe-finally

- Status: Confirmed
- Category: Maintainability
- Impact: qualidade estática quebrada; comportamento de `finally` com `return` é propenso a bugs.
- Why this matters: padrões inseguros em fluxo de controlo assíncrono afetam previsibilidade.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:324`
    - `frontend/src/app/components/category-movements-page.tsx:152`
    - output `npm run lint`
- Expected / state-of-the-art behavior:
    - lint verde sem regras de segurança/fluxo violadas.
- Current behavior:
    - `return` em `finally` ativa regra `no-unsafe-finally`.
- Risk scenario:
    - alterações futuras mascaram exceções ou flow-control inesperado.
- Recommendation direction (sem implementar):
    - refatorar blocos `try/catch/finally` para eliminar `return` em `finally`.
- Confidence:
    - High

### [F-010] [Medium] [Testing] Suite frontend com falha e warnings de act

- Status: Confirmed
- Category: Testing
- Impact: sinal de regressão e fragilidade de testes de UI assíncronos.
- Why this matters: pipeline verde perde valor quando testes críticos estão instáveis.
- Evidence:
    - `frontend/src/app/components/category-movements-page.test.tsx:135`
    - output `npm run test` (1 failed, warnings `act(...)`)
- Expected / state-of-the-art behavior:
    - testes determinísticos sem warnings de sincronização React.
- Current behavior:
    - teste falha em conteúdo esperado e componente mantém warnings de `act`.
- Risk scenario:
    - regressões reais passam ou tornam-se intermitentes.
- Recommendation direction (sem implementar):
    - estabilizar fluxo assíncrono dos testes e eliminar warnings `act`.
- Confidence:
    - High

### [F-011] [Medium] [Supply Chain] Vulnerabilidades conhecidas em dependências frontend

- Status: Confirmed
- Category: Security
- Impact: exposição a advisories já publicados.
- Why this matters: cadeia de dependências é vetor comum de incidentes.
- Evidence:
    - output `npm audit --package-lock-only` (frontend)
    - pacote `flatted <=3.4.1` (high)
    - pacote `vite 6.0.0 - 6.4.0` (moderate)
- Expected / state-of-the-art behavior:
    - lockfile sem vulnerabilidades conhecidas de severidade relevante.
- Current behavior:
    - 2 vulnerabilidades reportadas.
- Risk scenario:
    - exploração via ambiente de dev/tooling ou superfícies runtime associadas.
- Recommendation direction (sem implementar):
    - atualizar versões afetadas e validar impacto de breaking changes.
- Confidence:
    - High

### [F-012] [Medium] [Supply Chain] Sem gate efetivo de provenance/signatures

- Status: Likely / Needs confirmation
- Category: CI/CD
- Impact: integridade de artefactos npm não é atestada na pipeline.
- Why this matters: baseline moderno exige defesa também contra tampering na supply chain.
- Evidence:
    - `.github/workflows/ci.yml` (sem `npm audit signatures`)
    - `docs/operations/ci-cd.md:62`
    - tentativa local de `npm audit signatures` não concluída nesta ronda
- Expected / state-of-the-art behavior:
    - pipeline com verificação de provenance/signatures e política de falha.
- Current behavior:
    - apenas `npm audit` tradicional.
- Risk scenario:
    - pacote comprometido com assinatura/proveniência inválida não é barrado.
- Recommendation direction (sem implementar):
    - adicionar gate de signatures/provenance no CI com baseline de allowlist.
- Confidence:
    - Medium

### [F-013] [Medium] [Backend/Ops] /metrics pode ficar público

- Status: Confirmed
- Category: Security
- Impact: telemetria interna exposta quando token não configurado.
- Why this matters: metadados operacionais ajudam reconhecimento de ataque.
- Evidence:
    - `backend/src/app.ts:107-114`
    - `backend/src/config/env.ts:22`
    - `backend/src/config/env.ts:83`
- Expected / state-of-the-art behavior:
    - endpoint de métricas sempre protegido por auth de infraestrutura.
- Current behavior:
    - proteção condicional a variável opcional.
- Risk scenario:
    - scraping externo de métricas HTTP e disponibilidade.
- Recommendation direction (sem implementar):
    - tornar token obrigatório em ambientes expostos e restringir network ACL.
- Confidence:
    - High

### [F-014] [Medium] [Operations] Sem graceful shutdown explícito

- Status: Confirmed
- Category: Backend
- Impact: término abrupto pode interromper requests/jobs e aumentar inconsistências.
- Why this matters: operação resiliente exige drenagem e fecho limpo.
- Evidence:
    - `backend/src/server.ts:7-16`
- Expected / state-of-the-art behavior:
    - handlers para `SIGTERM/SIGINT`, fecho de listener e DB.
- Current behavior:
    - bootstrap simples sem shutdown lifecycle.
- Risk scenario:
    - rollout/restart com requisições perdidas.
- Recommendation direction (sem implementar):
    - implementar shutdown coordenado com timeout e logs estruturados.
- Confidence:
    - High

### [F-015] [Medium] [Security] Logging sem redaction formal

- Status: Confirmed
- Category: Security
- Impact: risco de exposição acidental de dados sensíveis em logs.
- Why this matters: logs são superfície de exfiltração comum.
- Evidence:
    - `backend/src/config/logger.ts:4-16`
    - `backend/src/app.ts:54`
- Expected / state-of-the-art behavior:
    - política de `redact` explícita (`authorization`, cookies, tokens, payloads sensíveis).
- Current behavior:
    - logger sem `redact` configurado; request log inclui URL completa.
- Risk scenario:
    - dados sensíveis persistidos em agregadores de logs.
- Recommendation direction (sem implementar):
    - definir redaction padrão e checklist de campos sensíveis.
- Confidence:
    - Medium

### [F-016] [High] [Auth/Accounts] deleteMe valida último owner fora da transação

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: possível violação do invariante “conta partilhada não pode ficar sem owner”.
- Why this matters: regra crítica de autorização e governança da conta.
- Evidence:
    - `backend/src/modules/auth/service.ts:759-766`
    - `backend/src/modules/auth/service.ts:777-807`
- Expected / state-of-the-art behavior:
    - check + update de owner count no mesmo escopo transacional com revalidação.
- Current behavior:
    - pré-check antes de iniciar transação; decrementos depois.
- Risk scenario:
    - duas operações concorrentes podem ambas passar no check e remover owners em excesso.
- Recommendation direction (sem implementar):
    - mover validação para dentro da transação com condição atómica.
- Confidence:
    - Medium

### [F-017] [Medium] [Scheduler] Lease sem heartbeat

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: job diário pode executar em paralelo em cenários de execução longa.
- Why this matters: recorrências duplicadas geram ruído operacional e custo.
- Evidence:
    - `backend/src/jobs/scheduler.ts:10`
    - `backend/src/jobs/scheduler.ts:14`
    - `backend/src/jobs/scheduler.ts:72-76`
- Expected / state-of-the-art behavior:
    - lease renovável/heartbeat ou lock com fencing token.
- Current behavior:
    - janela fixa de 15 min sem renew.
- Risk scenario:
    - instância A excede janela; instância B adquire lock e executa também.
- Recommendation direction (sem implementar):
    - adotar lock renovável e fencing para execução distribuída.
- Confidence:
    - Medium

### [F-018] [Medium] [API] IDs de transação/recorrência sem validação ObjectId nos validators

- Status: Likely / Needs confirmation
- Category: Validation
- Impact: entradas inválidas podem produzir erros de cast e respostas 500.
- Why this matters: API hardening exige rejeição precoce e coerente (`422/400`).
- Evidence:
    - `backend/src/modules/transactions/validators.ts:41-43`
    - `backend/src/modules/recurring/validators.ts:5-7`
- Expected / state-of-the-art behavior:
    - validação de formato ObjectId ao nível de contrato.
- Current behavior:
    - apenas `min(1)`.
- Risk scenario:
    - payload malformado aciona paths não cobertos por erro de domínio.
- Recommendation direction (sem implementar):
    - alinhar para regex/validator de ObjectId em todos params de id Mongo.
- Confidence:
    - Medium

### [F-019] [Low] [API] Schemas não estritos (campos extra ignorados silenciosamente)

- Status: Confirmed
- Category: API Contract
- Impact: cliente pode enviar campos inválidos sem feedback.
- Why this matters: contratos explícitos reduzem drift e ambiguidades.
- Evidence:
    - `backend/src/modules/transactions/validators.ts:20-27`
    - `backend/src/modules/budgets/validators.ts:27-30`
- Expected / state-of-the-art behavior:
    - rotas críticas com contrato estrito (ou política explícita de passthrough).
- Current behavior:
    - campos extras são descartados sem erro na maioria dos schemas.
- Risk scenario:
    - breaking changes silenciosas e bugs de integração difíceis de detetar.
- Recommendation direction (sem implementar):
    - definir estratégia consistente (`strict` vs `passthrough`) por endpoint.
- Confidence:
    - Medium

### [F-020] [Medium] [FE<->BE Contract] Password mínima diverge entre FE e BE

- Status: Confirmed
- Category: API Contract
- Impact: fricção de UX e falha evitável no registo.
- Why this matters: validação inconsistente cria retrabalho e abandono de fluxo.
- Evidence:
    - `frontend/src/app/components/auth-page.tsx:80-83`
    - `frontend/src/app/components/auth-page.tsx:236-237`
    - `backend/src/modules/auth/validators.ts:11`
- Expected / state-of-the-art behavior:
    - FE e BE com mesma policy mínima.
- Current behavior:
    - FE aceita >=6, BE exige >=10.
- Risk scenario:
    - utilizador preenche formulário válido no FE e recebe erro de backend.
- Recommendation direction (sem implementar):
    - centralizar política de password e expor contrato único para FE.
- Confidence:
    - High

### [F-021] [Medium] [Docs Drift] Arquitetura diz que FE guarda refresh token

- Status: Confirmed
- Category: Docs Drift
- Impact: documentação de segurança desatualizada.
- Why this matters: modelo de ameaça depende de onde tokens são armazenados.
- Evidence:
    - `docs/architecture/system-overview.md:29`
    - `frontend/src/app/lib/token-store.ts:1-5`
    - `backend/src/lib/cookies.ts:27-33`
- Expected / state-of-the-art behavior:
    - docs refletirem cookie HttpOnly + access em memória.
- Current behavior:
    - doc descreve armazenamento de refresh no frontend.
- Risk scenario:
    - decisões de segurança/auditoria baseadas em premissa errada.
- Recommendation direction (sem implementar):
    - corrigir SSOT arquitetural e runbooks de auth.
- Confidence:
    - High

### [F-022] [Medium] [Docs Drift] Scheduler e snapshots de stats em conflito documental

- Status: Confirmed
- Category: Docs Drift
- Impact: operações e observabilidade podem ser desenhadas incorretamente.
- Why this matters: materialização vs on-demand altera capacidade e troubleshooting.
- Evidence:
    - `docs/architecture/system-overview.md:50`
    - `docs/backend/operations.md:26`
    - `backend/src/jobs/scheduler.ts:82-91`
- Expected / state-of-the-art behavior:
    - um comportamento documentado único.
- Current behavior:
    - docs contraditórias; código só gera recorrências.
- Risk scenario:
    - equipa assume snapshots pré-calculados quando não existem.
- Recommendation direction (sem implementar):
    - alinhar documentação e runbooks com comportamento real.
- Confidence:
    - High

### [F-023] [Medium] [Docs Drift] Docs FE sobre robustez de troca de conta não batem com implementação

- Status: Confirmed
- Category: Docs Drift
- Impact: falsa confiança em isolamento de estado.
- Why this matters: conta ativa é boundary funcional e de segurança de dados.
- Evidence:
    - `docs/frontend/state-and-api.md:194`
    - `docs/frontend/screens-flows.md:242`
    - `frontend/src/app/components/stats-page.tsx:115-157`
    - `frontend/src/app/components/recurring-rules-page.tsx:132-156`
- Expected / state-of-the-art behavior:
    - comportamento documentado e implementado de recarga consistente em account switch.
- Current behavior:
    - pelo menos duas páginas não cumprem.
- Risk scenario:
    - incidentes de “dados de conta errada” difíceis de reproduzir.
- Recommendation direction (sem implementar):
    - revisar docs após fechar gaps reais de dependência em `activeAccountId`.
- Confidence:
    - High

### [F-024] [High] [Business Rules] Categoria técnica de fallback pode ser escolhida diretamente em recorrências

- Status: Confirmed
- Category: Data Integrity
- Impact: categoria interna (`fallback_recurring_expense`) entra no fluxo funcional normal.
- Why this matters: categorias técnicas devem ser invisíveis para criação normal.
- Evidence:
    - `frontend/src/app/components/recurring-rules-page.tsx:158-159`
    - `frontend/src/app/components/recurring-rules-page.tsx:427-429`
    - `backend/src/modules/recurring/service.ts:121-140`
    - `docs/backend/business-rules.md:108-113`
- Expected / state-of-the-art behavior:
    - bloquear seleção/aceitação de IDs técnicos no FE e no BE.
- Current behavior:
    - FE oferece categoria do budget sem filtrar fallback; BE só verifica não-vazio para expense.
- Risk scenario:
    - regras novas criadas já em modo fallback técnico, mascarando erros de configuração.
- Recommendation direction (sem implementar):
    - tratar fallback como categoria reservada e inválida para input explícito.
- Confidence:
    - High

### [F-025] [Medium] [Database] Índice insuficiente para listagem paginada/sort de transações

- Status: Likely / Needs confirmation
- Category: Performance
- Impact: degradação com crescimento de dados (sort/filter em memória ou scans caros).
- Why this matters: endpoint de movimentos tende a alto volume.
- Evidence:
    - `backend/src/models/transaction.model.ts:73-77`
    - `backend/src/modules/transactions/service.ts:245-247`
    - `backend/src/modules/transactions/service.ts:226-233`
- Expected / state-of-the-art behavior:
    - índices compostos alinhados ao padrão de filtro+sort+cursor.
- Current behavior:
    - só índice base `(accountId, month)` + índice de idempotência recorrente.
- Risk scenario:
    - aumento de latência e custo de CPU/IO com dados reais.
- Recommendation direction (sem implementar):
    - desenhar índices por padrão de query de `listTransactions`.
- Confidence:
    - Medium

### [F-026] [Medium] [Database] Queries de fallback recorrente sem índice composto dedicado

- Status: Likely / Needs confirmation
- Category: Performance
- Impact: operações de fallback/migração podem escalar mal.
- Why this matters: manutenção de recorrências é caminho operacional sensível.
- Evidence:
    - `backend/src/modules/recurring/service.ts:143-148`
    - `backend/src/modules/recurring/service.ts:346-351`
    - `backend/src/modules/recurring/service.ts:356-362`
    - `backend/src/models/transaction.model.ts:73-77`
- Expected / state-of-the-art behavior:
    - índices compostos para filtros frequentes (`accountId`,`recurringRuleId`,`origin`,`categoryResolution`).
- Current behavior:
    - sem índice dedicado para esse padrão.
- Risk scenario:
    - reassign/migração degrada em contas com histórico extenso.
- Recommendation direction (sem implementar):
    - adicionar e validar índices por explain plans.
- Confidence:
    - Medium

### [F-027] [Low] [Security] Default de CORS frágil fora de produção

- Status: Confirmed
- Category: State-of-the-Art Gap
- Impact: configuração permissiva/ambígua aumenta risco de erro operacional.
- Why this matters: defaults inseguros propagam para ambientes de staging.
- Evidence:
    - `backend/src/config/env.ts:60`
    - `backend/src/app.ts:68-74`
- Expected / state-of-the-art behavior:
    - exigir origem explícita em todos ambientes conectados.
- Current behavior:
    - fallback para `*` quando variável ausente (fora de produção).
- Risk scenario:
    - deploy intermédio com CORS aberto ou com comportamento de credenciais inesperado.
- Recommendation direction (sem implementar):
    - eliminar fallback `*` e forçar configuração explícita por ambiente.
- Confidence:
    - Medium

### [F-028] [Low] [Security] Rate limiting de auth apenas por IP

- Status: Likely / Needs confirmation
- Category: State-of-the-Art Gap
- Impact: proteção limitada contra brute-force distribuído.
- Why this matters: ataques modernos usam pools de IP e rotação.
- Evidence:
    - `backend/src/modules/auth/routes.ts:24-43`
- Expected / state-of-the-art behavior:
    - combinação de limites por IP + identidade (email/user) + deteção adaptativa.
- Current behavior:
    - limite padrão do middleware sem chave adicional por identidade.
- Risk scenario:
    - brute force lento distribuído evita bloqueio efetivo.
- Recommendation direction (sem implementar):
    - reforçar estratégia de throttling em múltiplas dimensões.
- Confidence:
    - Medium

### [F-029] [Low] [CI/CD] E2E não executa em CI

- Status: Confirmed
- Category: Testing
- Impact: fluxos críticos de UI/autenticação multi-conta sem verificação automatizada em PR.
- Why this matters: unit/integration não capturam todas as regressões de jornada.
- Evidence:
    - `docs/operations/ci-cd.md:49`
    - `.github/workflows/ci.yml`
- Expected / state-of-the-art behavior:
    - smoke E2E mínimo em CI para caminhos de maior risco.
- Current behavior:
    - Playwright apenas manual/local.
- Risk scenario:
    - regressão de login/switch-account chega a produção com CI verde.
- Recommendation direction (sem implementar):
    - adicionar subset E2E curto e estável como gate opcional/obrigatório.
- Confidence:
    - High

### [F-030] [Medium] [CI/CD] Pipeline sem SAST/CodeQL/Semgrep

- Status: Confirmed
- Category: State-of-the-Art Gap
- Impact: classes de vulnerabilidade não são detetadas automaticamente.
- Why this matters: `npm audit` não cobre bugs lógicos de segurança no código.
- Evidence:
    - `.github/workflows/ci.yml`
- Expected / state-of-the-art behavior:
    - pipeline com scanning estático de segurança e policy de triagem.
- Current behavior:
    - só gitleaks + audit + testes/build.
- Risk scenario:
    - falhas de authz/validation escapam até auditoria manual.
- Recommendation direction (sem implementar):
    - integrar SAST com baseline de severidade e suppressions auditáveis.
- Confidence:
    - Medium

### [F-031] [Info] [Security] Segredos reais em `.env` local do workspace

- Status: Confirmed
- Category: Other
- Impact: risco operacional local imediato; exposição acidental fora do VCS.
- Why this matters: mesmo sem commit, segredos em ficheiros locais podem vazar via logs/screenshots/cópias.
- Evidence:
    - `backend/.env:3`
    - `backend/.env:12`
    - `git ls-files backend/.env` (não rastreado)
- Expected / state-of-the-art behavior:
    - uso de segredos rotativos e gestão segura mesmo em dev local.
- Current behavior:
    - valores sensíveis presentes em ficheiro local.
- Risk scenario:
    - partilha acidental do ficheiro ou terminal output.
- Recommendation direction (sem implementar):
    - rodar credenciais expostas e reforçar disciplina de secrets local.
- Confidence:
    - Medium

### [F-032] [Medium] [Stats] Dedupe de jobs de insight é local à instância

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: custo duplicado no provider e estados concorrentes em ambientes multi-instância.
- Why this matters: endpoint de IA é caro e sensível a duplicação.
- Evidence:
    - `backend/src/modules/stats/service.ts:134`
    - `backend/src/modules/stats/service.ts:515-594`
- Expected / state-of-the-art behavior:
    - coordenação distribuída para execução única por insight pendente.
- Current behavior:
    - dedupe runtime em `Map` local por processo.
- Risk scenario:
    - duas instâncias processam o mesmo insight pendente em paralelo.
- Recommendation direction (sem implementar):
    - lock distribuído por `insightId`/estado pendente no DB.
- Confidence:
    - Medium

### [F-033] [Medium] [Backend] Contrato de nullability `colorSlot` inconsistente

- Status: Confirmed
- Category: API Contract
- Impact: fricção constante entre modelos, DTOs e build TypeScript.
- Why this matters: inconsistência de tipos é origem de regressões silenciosas.
- Evidence:
    - `backend/src/modules/stats/service.ts:215`
    - `backend/src/modules/stats/service.ts:350`
    - output `npm run build`
- Expected / state-of-the-art behavior:
    - contrato único para `colorSlot` (nullable ou opcional, não ambos incoerentes).
- Current behavior:
    - combinação de tipos incompatíveis (`null` vs `undefined`) no pipeline de stats/insights.
- Risk scenario:
    - patches locais de tipagem escondem bug semântico de dados.
- Recommendation direction (sem implementar):
    - normalizar contrato desde schema Mongo até tipos FE.
- Confidence:
    - High

### [F-034] [Low] [Operations] Readiness pode false-negative com permissões Mongo restritas

- Status: Likely / Needs confirmation
- Category: Other
- Impact: pods/instâncias podem ser marcados “not ready” apesar de operacionais.
- Why this matters: disponibilidade depende de readiness correto.
- Evidence:
    - `backend/src/config/db.ts:29-36`
- Expected / state-of-the-art behavior:
    - readiness robusta a perfis mínimos de privilégio.
- Current behavior:
    - check inclui `admin().command({ hello: 1 })` e avaliação de transações.
- Risk scenario:
    - ambiente com permissões limitadas reprova readiness sem necessidade.
- Recommendation direction (sem implementar):
    - separar checks de conectividade e capacidade transacional com fallback explícito.
- Confidence:
    - Medium

## 5. Cross-Cutting Risks

- Root cause 1: **drift documental recorrente** em contratos críticos (`X-Account-Id`, scheduler snapshots, armazenamento de tokens, comportamento de account switch).
- Root cause 2: **consistência eventual não intencional** em domínio financeiro por bug de sincronização e gaps de reload FE.
- Root cause 3: **concorrência distribuída parcialmente tratada** (locks simples sem heartbeat, jobs IA com dedupe local).
- Root cause 4: **pipeline de qualidade incompleta** para baseline 2026 (SAST/provenance/e2e CI).

Padrões repetidos:

- Contratos definidos em múltiplos documentos com divergência real.
- Dependência excessiva de comportamento “best effort” em fluxos sensíveis.
- Cobertura de testes forte em alguns blocos, mas sem fechar cenários multi-conta concorrentes no FE.

## 6. FE <-> BE <-> BD Contract Mismatches

| Mismatch                       | Documented behavior                       | Real behavior                                         | Evidence                                                                                                                 | Risk                                     |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Password mínimo                | FE aparenta mínimo 6                      | BE exige mínimo 10                                    | `frontend/src/app/components/auth-page.tsx:80-83`, `backend/src/modules/auth/validators.ts:11`                           | Erro UX/fluxo de registo                 |
| Header de conta                | Parte da doc diz `X-Account-Id` opcional  | Rotas financeiras exigem header                       | `docs/backend/business-rules.md:9`, `backend/src/middleware/account-context.ts:30-33`                                    | Integrações falham e confusão de scoping |
| Refresh token storage          | Arquitetura indica FE guarda refresh      | Implementação usa cookie HttpOnly                     | `docs/architecture/system-overview.md:29`, `backend/src/lib/cookies.ts:27-33`, `frontend/src/app/lib/token-store.ts:1-5` | Threat model/documentação incorretos     |
| Scheduler stats snapshots      | Arquitetura diz materialização diária     | Scheduler só gera recorrências                        | `docs/architecture/system-overview.md:50`, `backend/src/jobs/scheduler.ts:82-91`                                         | Runbooks/expectativas de dados erradas   |
| Account switch em Stats        | Docs de fluxo dizem reload Month/Stats    | `StatsPage` não depende de conta ativa                | `docs/frontend/screens-flows.md:242`, `frontend/src/app/components/stats-page.tsx:115-157`                               | Stale view entre contas                  |
| Account switch em Recorrências | Docs de robustez sugerem recarga segura   | `RecurringRulesPage` não depende de `activeAccountId` | `docs/frontend/state-and-api.md:194`, `frontend/src/app/components/recurring-rules-page.tsx:132-156`                     | UI fora de contexto                      |
| Sync `totalBudget`             | Docs afirmam sync em write path de income | função de sync está vazia                             | `docs/backend/business-rules.md:76-79`, `backend/src/modules/budgets/service.ts:511-514`                                 | Invariante quebrada                      |

## 7. Security Gaps vs Modern Baseline

### OWASP ASVS 5.0 / API Security Top 10 (resumo)

- API2/BOLA: base geral boa com `accountId` + membership checks; **gap** em consistência FE account-switch (risco de exposição contextual na UI).
- API4/Unrestricted resource consumption: rate limits existem, mas **gaps** em dimensão/estratégia (auth por IP apenas; jobs IA sem coordenação distribuída robusta).
- API8/Security misconfiguration: **gaps** em `/metrics` opcionalmente público, CORS default permissivo fora de produção, falta de redaction formal em logs.
- API10/Unsafe consumption/dependencies: **gaps** por vulnerabilidades frontend e ausência de gate de provenance/signatures.

### RFC 8725 (JWT BCP)

- Ponto positivo: verificação explícita de algoritmo, issuer e audience (`backend/src/lib/jwt.ts:57-69`).
- Gap residual: fluxo de refresh ainda aceita token no body por compatibilidade (`backend/src/modules/auth/routes.ts:79`), aumentando superfície de exposição operacional.

### Node/Express/Mongo hardening

- Ponto positivo: `helmet`, rate limit global, readiness/liveness, cookies HttpOnly.
- Gaps: graceful shutdown ausente, logs sem redaction policy, lock de scheduler simplificado, potencial false-negative de readiness por permissões admin.

### npm supply-chain baseline

- Ponto positivo: `npm audit` em CI + secret scan (`gitleaks`).
- Gaps: sem provenance/signature gate e vulnerabilidades abertas no frontend lockfile.

## 8. Test Coverage Gaps

- Cenários críticos sem cobertura efetiva observável nesta execução:
    - troca de conta com invalidação correta em `StatsPage` e `RecurringRulesPage`.
    - concorrência de `deleteMe`/owner protection.
    - coordenação multi-instância para scheduler e insight jobs.
    - hardening de validação de IDs inválidos em params.
- Fragilidade atual detectada:
    - falha em `category-movements-page.test.tsx` + warnings `act` indicam falta de sincronização robusta em testes assíncronos.
- Prioridades de cobertura:
    1. Multi-account switch com asserts de stale-state.
    2. Invariantes de `totalBudget` no write path de income.
    3. Concorrência owner-removal/deleteMe.
    4. Fluxos de recorrência com categoria técnica/fallback.

## 9. Docs vs Implementation Drift

- `X-Account-Id` opcional vs obrigatório (`docs/backend/business-rules.md:9` vs `backend/src/middleware/account-context.ts:30-33`).
- Scheduler “materializa snapshots” vs código real apenas gera recorrências (`docs/architecture/system-overview.md:50` vs `backend/src/jobs/scheduler.ts:82-91`).
- Frontend “guarda access+refresh” vs implementação de refresh em cookie HttpOnly (`docs/architecture/system-overview.md:29` vs `backend/src/lib/cookies.ts:27-33`).
- Frontend “Month/Stats robustos na troca de conta” vs `StatsPage`/`RecurringRulesPage` sem dependência de conta ativa.
- Regra de sync imediata de `totalBudget` vs função de sync vazia.

Risco do drift:

- onboarding técnico incorreto,
- incident response mais lento,
- decisões de produto/segurança baseadas em premissas falsas.

## 10. Prioritized Remediation Order

### P0 imediatos

1. Corrigir build backend (`F-001`, `F-033`).
2. Restaurar sincronização efetiva de `totalBudget` no write path de income (`F-002`, `F-003`).
3. Corrigir reload seguro por conta ativa em `StatsPage` e `RecurringRulesPage` (`F-005`, `F-006`).
4. Bloquear uso explícito da categoria técnica de fallback em recorrências (`F-024`).

### P1 curto prazo

1. Fechar falhas de lint/test frontend (`F-009`, `F-010`).
2. Resolver vulnerabilidades frontend (`F-011`).
3. Endurecer `/metrics` e logging/redaction (`F-013`, `F-015`).
4. Alinhar contratos/documentação críticos (`F-004`, `F-021`, `F-022`, `F-023`).

### P2 médio prazo

1. Reforçar concorrência em `deleteMe` e scheduler lease (`F-016`, `F-017`).
2. Endurecer validações de IDs e schemas (`F-018`, `F-019`).
3. Melhorar índices para queries de transações/recorrências (`F-025`, `F-026`).
4. Uniformizar UTC no frontend (`F-007`, `F-008`).

### P3 melhorias estruturais

1. Evoluir CI para SAST/provenance e smoke E2E (`F-012`, `F-029`, `F-030`).
2. Rever defaults e observabilidade operacional (`F-027`, `F-028`, `F-034`).
3. Reforçar hygiene de segredos locais e rotação (`F-031`).

## 11. Appendix

### Comandos executados (principais)

- Inventário/estrutura:
    - `ls -la`
    - `rg --files docs | sort`
    - `rg --files backend/src | sort`
    - `rg --files frontend/src | sort`
- Leitura com evidência:
    - `nl -ba <ficheiro> | sed -n ...` em docs/backend/frontend/models/services/routes
- Qualidade backend:
    - `npm run build` (falha)
    - `npm run test:unit` (passa)
    - `npm run test:integration` (falha por EPERM sandbox)
- Qualidade frontend:
    - `npm run typecheck` (passa)
    - `npm run lint` (falha)
    - `npm run check:tokens` (passa)
    - `npm run check-theme-contract` (passa)
    - `npm run test` (falha)
    - `npm run build` (passa)
- Supply-chain:
    - `npm audit --package-lock-only` backend (0)
    - `npm audit --package-lock-only` frontend (2 vuln)

### Outputs relevantes

- Backend build:
    - `TS2322` e `TS2345` em `src/modules/stats/service.ts` (linhas 215 e 350).
- Frontend lint:
    - `no-unsafe-finally` em `month-page.tsx:324` e `category-movements-page.tsx:152`.
- Frontend test:
    - falha em `category-movements-page.test.tsx` (“Unable to find text: Continente”) + warnings `act(...)`.
- Backend integration tests:
    - `listen EPERM: operation not permitted 0.0.0.0` (sandbox).
- npm audit frontend:
    - `flatted <=3.4.1` (high), `vite 6.0.0-6.4.0` (moderate advisories).

### Ficheiros lidos (resumo)

- SSOT completo conforme secção 2.
- Backend core: `app.ts`, `server.ts`, `config/*`, `middleware/*`, `modules/*`, `models/*`, `jobs/scheduler.ts`.
- Frontend core: `lib/*`, páginas principais (`month`, `stats`, `stats-insights`, `recurring-rules`, `auth`, `layout`).
- Operação/CI: `.github/workflows/ci.yml`, docs de deployment/ci/runbooks.

### Notas de ambiente

- Ambiente com limitações de sandbox para testes de integração Mongo in-memory.
- Auditoria de signatures/provenance npm não foi consolidada nesta ronda.

### Dúvidas em aberto

- `F-016` (race em deleteMe): requer teste concorrente controlado para confirmação empírica.
- `F-017` (lease scheduler): requer simulação multi-instância com job > 15 min.
- `F-018` (IDs inválidos -> 500): requer teste de integração com IDs malformados.
- `F-025`/`F-026` (índices): requer `explain()` em dataset real para quantificar impacto.
- `F-034` (readiness false-negative): requer validação no perfil de permissões do ambiente alvo.
