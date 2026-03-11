# App de Controlo de Despesas e Orçamentos (MVP Completo)

## Resumo
Construir uma app **mobile-first**, extremamente simples de usar, mas com MVP funcional completo: autenticação, ecrã mensal, orçamento por percentagens com subgrupos (2 níveis), lançamentos manuais + recorrentes, e estatísticas avançadas semestrais/anuais.  
Stack final: **React + Axios + Node.js + Express + MongoDB**, tudo em **TypeScript**, pronto para **produção imediata** e preparado para evolução futura para cliente nativo.

## Escopo funcional (MVP)
- Registo, login, refresh token e logout seguro.
- Ecrã “Mês Atual” com:
- Receitas recorrentes (ordenado, etc.) e despesas fixas.
- Lançamentos variáveis manuais (receitas/despesas).
- Saldo do mês, gasto total, receita total.
- Orçamento mensal por percentagens:
- Grupos principais (ex: Despesas, Lazer, Investimento, Poupança, Projetos).
- Subgrupos por grupo principal (2 níveis no total).
- Percentagem alvo e valor monetário calculado automaticamente.
- Ecrã de estatísticas:
- Semestral (últimos 6 meses) e anual (últimos 12 meses).
- Totais por período (receitas, despesas, saldo).
- Tendência mensal.
- Budget vs actual por grupo e subgrupo.
- Projeção de fim de período (forecast simples com base na média móvel dos últimos 3 meses).
- Conta individual (sem partilha multi-utilizador no MVP).

## Arquitetura técnica

### Frontend (React)
- React 19 + TypeScript + Vite.
- Mobile-first com Tailwind CSS (breakpoints para tablet/desktop sem alterar fluxo principal).
- Estado de servidor com TanStack Query.
- Formulários com React Hook Form + Zod.
- Navegação com React Router.
- Axios com interceptors para JWT access token e refresh automático.
- PWA installable (manifest + service worker para shell/offline leve de UI, sem sync offline de dados no MVP).
- Ecrãs:
- `Auth` (login/registo).
- `Dashboard Mensal`.
- `Orçamento`.
- `Estatísticas`.

### Backend (Node.js + Express)
- Node.js LTS + Express + TypeScript.
- Estrutura por módulos: `auth`, `transactions`, `recurring`, `budgets`, `stats`, `users`.
- Validação de input com Zod/Joi (decisão: Zod para consistência com frontend).
- JWT access token curto (15 min) + refresh token rotativo (7 dias) com revogação.
- Idempotência para geração de recorrências mensais.
- Cron diário para:
- Gerar lançamentos recorrentes do mês quando faltar.
- Atualizar agregados de estatísticas materializados.
- Observabilidade: logs estruturados (Pino), health checks, métricas básicas.

### Base de dados (MongoDB)
- MongoDB Atlas (produção).
- Mongoose com schemas versionados e índices.
- Estratégia: documentos normalizados por coleção (sem denormalização agressiva no MVP).

## Modelagem de dados (MongoDB)

### `users`
- `email` (único, indexado).
- `passwordHash`.
- `profile` (nome, moeda principal: default EUR, locale pt-PT).
- `createdAt`, `updatedAt`.

### `refresh_tokens`
- `userId` (indexado).
- `tokenHash`.
- `expiresAt`.
- `revokedAt`.
- `deviceInfo`.

### `budget_plans`
- `userId` (indexado).
- `month` (YYYY-MM, indexado com userId).
- `incomePlanned`.
- `groups` (array):
- `groupId`, `name`, `percent`.
- `subgroups` (array): `subgroupId`, `name`, `percent`.
- Regra: soma grupos = 100%; soma subgrupos de cada grupo = 100%.

### `recurring_rules`
- `userId` (indexado).
- `type` (`income` | `expense`).
- `name`.
- `amount`.
- `dayOfMonth`.
- `categoryGroupId`, `categorySubgroupId`.
- `startMonth`, `endMonth?`.
- `active`.

### `transactions`
- `userId` (indexado).
- `month` (YYYY-MM, indexado com userId).
- `date`.
- `type` (`income` | `expense`).
- `origin` (`manual` | `recurring`).
- `recurringRuleId?`.
- `description`.
- `amount`.
- `categoryGroupId`, `categorySubgroupId`.
- `createdAt`, `updatedAt`.

### `stats_snapshots` (opcional mas incluído no MVP por produção imediata)
- `userId` (indexado).
- `periodType` (`semester` | `year`).
- `periodKey` (ex: `2026-S1`, `2026`).
- `totals`, `byGroup`, `bySubgroup`, `trend`, `budgetVsActual`, `forecast`.
- Atualizado por job + fallback on-demand.

## APIs públicas/interfaces/tipos

### Auth
- `POST /api/v1/auth/register` -> cria utilizador.
- `POST /api/v1/auth/login` -> devolve `accessToken` + `refreshToken`.
- `POST /api/v1/auth/refresh` -> novo par de tokens.
- `POST /api/v1/auth/logout` -> revoga refresh token.

### Mês atual e transações
- `GET /api/v1/months/current` -> resumo mensal + listas (receitas/despesas).
- `GET /api/v1/transactions?month=YYYY-MM&type=income|expense`.
- `POST /api/v1/transactions`.
- `PATCH /api/v1/transactions/:id`.
- `DELETE /api/v1/transactions/:id`.

### Recorrências
- `GET /api/v1/recurring-rules`.
- `POST /api/v1/recurring-rules`.
- `PATCH /api/v1/recurring-rules/:id`.
- `DELETE /api/v1/recurring-rules/:id`.
- `POST /api/v1/recurring-rules/generate?month=YYYY-MM` (idempotente, protegido).

### Orçamento
- `GET /api/v1/budgets/:month`.
- `PUT /api/v1/budgets/:month` (upsert completo do plano mensal).

### Estatísticas
- `GET /api/v1/stats/semester?endingMonth=YYYY-MM`.
- `GET /api/v1/stats/year?year=YYYY`.
- `GET /api/v1/stats/compare-budget?from=YYYY-MM&to=YYYY-MM`.

### Tipos partilhados (pacote comum `shared-types`)
- `Money`, `MonthKey`, `TransactionDTO`, `RecurringRuleDTO`, `BudgetPlanDTO`, `StatsDTO`, `AuthTokensDTO`, `ApiErrorDTO`.

## Regras de negócio chave
- Geração recorrente é idempotente por `(userId, recurringRuleId, month)`.
- Transação de recorrência pode ser editada sem alterar a regra mãe.
- Orçamento só é válido com percentagens fechadas a 100% (com tolerância técnica de 0.01).
- Estatísticas semestrais usam janela móvel de 6 meses; anuais de 12 meses.
- Forecast calcula projeção de saldo final por média móvel simples.
- Soft-delete não será usado no MVP; delete físico com auditoria mínima em logs.

## Produção imediata (estado da arte pragmático)
- Deploy frontend em Vercel (ou Netlify) e backend em Fly/Render.
- MongoDB Atlas com IP allowlist e utilizador dedicado.
- CI/CD GitHub Actions:
- Lint, typecheck, testes, build.
- Deploy automático em `main`.
- Segurança:
- Helmet, CORS restrito, rate limit por IP e por rota de auth.
- Hash de passwords com Argon2id.
- Secrets via environment manager do provedor.
- Operação:
- Endpoint `/health` e `/ready`.
- Logs estruturados com correlação por request id.

## Testes e cenários de validação

### Backend
- Unit tests de serviços de orçamento, geração recorrente e forecast.
- Integration tests de rotas auth, budgets, transactions, stats.
- Testes de segurança: token expirado, refresh revogado, acesso cross-user bloqueado.

### Frontend
- Testes de componentes críticos (formulários e cartões de resumo).
- Testes de fluxo (login -> dashboard -> criar transação -> ver impacto em stats).
- Testes responsivos mobile-first (larguras 360px, 390px, 768px, 1024px).

### E2E (Playwright)
- Registar utilizador, configurar orçamento, criar recorrência, gerar mês, validar dashboard.
- Inserir despesas variáveis e confirmar budget vs actual.
- Abrir estatísticas semestrais e anuais e validar totais/tendência.

### Critérios de aceitação
- Utilizador autenticado vê apenas os próprios dados.
- Ecrã mensal carrega em <2s com até 1000 transações do utilizador.
- Orçamento com 2 níveis é criado/editado sem erro e mantém regra de 100%.
- Estatísticas semestre/ano refletem dados reais e comparação com orçamento.

## Assunções e defaults explícitos
- Idioma inicial: português (pt-PT).
- Moeda principal única no uso diário (EUR), com modelo já preparado para multi-moeda futura.
- Conta individual apenas.
- MVP inclui tudo o que pediste (sem faseamento funcional).
- Sem integração bancária automática no MVP; entradas são manuais ou por recorrência configurada.
- Sem anexos/recibos no MVP.
