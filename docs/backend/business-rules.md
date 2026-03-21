# Backend Regras de Negocio

Este documento descreve as regras funcionais implementadas no codigo atual.

## 1) Multi-conta e autorizacao

- Cada user deve ter exatamente 1 conta pessoal valida.
- Operacoes financeiras sempre scoped por `accountId`.
- `X-Account-Id` e obrigatorio em endpoints financeiros account-scoped.
- Endpoints fora do escopo financeiro (ex.: auth/accounts) podem resolver conta pessoal por fallback interno quando aplicavel.
- Se nao existir membership ativa para a conta, pedido falha com `ACCOUNT_ACCESS_DENIED`.

## 1.1) Sessões e refresh

- A API de sessoes expõe `sid` como identificador canonico da sessao.
- Quando a listagem inclui `jti`, esse campo e apenas um alias legado de `sid`; nao representa o `jti` do refresh token.
- Refresh tokens sao one-time use.
- `AuthSession.currentRefreshJti` e a fonte de verdade da rotação ativa da sessao.
- `POST /auth/refresh` avanca a sessao apenas se o `jti` apresentado ainda for o atual.
- Se dois pedidos concorrentes usarem o mesmo refresh token, apenas um pode vencer; o outro falha com `401` e a sessao continua valida com o refresh mais recente.
- A revogacao em massa (`logout`, `revoke-all`, delete account) continua a invalidar a familia de sessoes/tokens; replay concorrente normal nao faz logout global.

### Roles

- `owner`
  - leitura/escrita financeira
  - gestao de membros e convites
- `editor`
  - leitura/escrita financeira
  - sem gestao de membros/convites
- `viewer`
  - leitura financeira apenas

## 2) Conta pessoal como invariante

Garantida por:
- register transacional cria user + conta pessoal + membership owner,
- `ensurePersonalAccountForUser` corrige legado quando necessario,
- `personalAccountId` e obrigatorio no schema de `User`.

## 3) Convites para conta partilhada

- So `owner` pode gerar convite.
- Convite so existe para contas `shared`.
- Codigo guardado como hash (`codeHash`).
- Novo codigo revoga codigos ativos anteriores.
- Join por codigo cria membership com role default `viewer` para users novos; se existir membership inativa, o backend reativa-a preservando a role anterior.
- `accounts.activeInviteCodeId` e a referencia operacional do convite activo; o backend faz claim atómico desse valor antes de aceitar o join.

## 4) Regras de ownership

- Conta partilhada nao pode ficar sem owner.
- `activeOwnerCount` e um contador operacional mantido pelo backend a partir das memberships ativas `owner`.
- Quando uma membership inativa e reativada por convite, o backend reconcilia `activeOwnerCount` na mesma transacao.
- Ao demover/remover owner ou sair da conta sendo owner:
  - backend conta owners ativos dentro de transacao,
  - se for o ultimo owner, bloqueia com erro explicito.

## 5) Orcamento mensal

### Templates
Templates fixos expostos por `/budgets/templates`:
- `conservador` (50/10/20/20)
- `equilibrado` (60/5/15/20)
- `agressivo` (70/10/15/5)

### Validade (`isReady`)
Budget valido quando:
- tem pelo menos 1 categoria,
- soma de percentagens == 100 (tolerancia 0.01).

### Integridade
- IDs de categoria duplicados sao rejeitados.
- `totalBudget` nao vem da UI: e sempre recalculado por receita real do mes.

## 6) Bloqueio de lancamentos manuais

Em `transactions.service`:
- `POST /transactions` cria sempre transacoes `manual`.
- `createTransaction` com `origin=manual` exige budget valido no `input.month`.
- `updateTransaction` de transacao manual valida mes final (se data mudar de mes).
- Sem budget valido, erro `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS` (422).

Transacoes recorrentes internas nao passam por este bloqueio.

## 6.1) Listagem paginada de transacoes

- `listTransactions` usa `cursor` apenas para paginação de `items`.
- `totalCount` e `totalAmount` representam o conjunto filtrado completo e nao apenas a pagina corrente.
- Os filtros de negocio (`month`, `type`, `categoryId`, `origin`, `dateFrom`, `dateTo`) compoem a base de contagem; o cursor nao altera os totais.

## 7) totalBudget derivado de receitas

Fonte de verdade:
- soma de todas as transacoes `type=income` da conta+mes.

Sincronizacao:
- em `getBudget` (leitura): corrige e persiste divergencia se existir,
- em create/update/delete de transacao income: sincroniza budget do(s) mes(es) afetado(s),
- em `saveBudget` e `copyBudgetFromMonth`: total e calculado server-side.

## 8) Categorias de receita

- Cada conta tem uma categoria default (`Outras receitas`) garantida pelo backend.
- Nomes ativos de categoria sao unicos por conta (normalizados em lowercase).
- A categoria default nao pode ser removida nem desativada.
- Transacoes `income` exigem categoria de receita ativa da conta:
  - erro `INCOME_CATEGORY_REQUIRED` quando ausente
  - erro `INCOME_CATEGORY_NOT_FOUND`/`INCOME_CATEGORY_INACTIVE` quando invalida

## 9) Recorrencias

- Regra ativa para mes quando:
  - `active=true`
  - `startMonth <= month`
  - `endMonth` ausente ou `endMonth >= month`
- Geracao usa upsert por `(accountId, recurringRuleId, month)` para idempotencia.
- `dayOfMonth` e ajustado ao ultimo dia real do mes.
- Semantica de vencimento:
  - mes atual: gera apenas regras vencidas ate ao dia UTC corrente,
  - meses passados: gera todas as regras ativas do mes,
  - meses futuros: nao gera.

### 9.1) Fallback de categoria na geracao

- `income`:
  - se categoria da regra estiver invalida/inativa, backend usa categoria default de receita da conta.
- `expense`:
  - se categoria da regra nao existir no budget do mes, backend usa categoria tecnica:
    - id: `fallback_recurring_expense`
    - nome: `Sem categoria (recorrente)`
    - `kind=expense`, `percent=0`
    - protegida contra remocao por endpoint de remover categoria.

Rastreabilidade:
- transacao recorrente inclui:
  - `categoryResolution` (`direct|fallback`)
  - `requestedCategoryId` quando houve fallback.

Saude operacional por regra:
- `lastGenerationAt`
- `lastGenerationStatus` (`ok|fallback`)
- `pendingFallbackCount` (contagem atual de lancamentos recorrentes em fallback).

### 9.2) Reatribuicao

- endpoint `POST /recurring-rules/:id/reassign-category`:
  - atualiza categoria da regra para geracoes futuras;
  - opcao `migratePastFallbackTransactions` migra historico em fallback dessa regra para a nova categoria.

## 10) Stats

- Nao usam dados random no backend.
- Dados calculados em tempo real sobre transactions + budgets do periodo.
- `budgeted` por categoria e calculado com:
  - `% da categoria` x `income real do mes`.
- Retorna `categorySeries` para detalhe mensal por categoria.
- Retorna `totalsBreakdown` (opcional, nao-breaking) com semantica explicita:
  - `consumption = sum(actual where categoryKind != reserve)`
  - `savings = sum(actual where categoryKind == reserve)`
  - `unallocated = totalIncome - consumption - savings`
  - `potentialSavings = savings + max(unallocated, 0)`
  - `rates.* = value / totalIncome * 100` (se `totalIncome <= 0`, taxa = `0`)
- `categoryKind` ausente e tratado como `expense` (entra em `consumption`).
- compatibilidade: `totals.totalExpense` mantem semantica atual (`consumption + savings`).

## 11) Tutorial

- `tutorialSeenAt` em `User`.
- Se `null`, frontend pode iniciar tutorial automaticamente.
- `POST /auth/tutorial/complete` marca conclusao (skip/done).

## 12) Semantica temporal

- Chave mensal `YYYY-MM`.
- Backend usa UTC para derivacao de mes e datas de recorrencia.
