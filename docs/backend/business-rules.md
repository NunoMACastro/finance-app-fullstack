# Backend Regras de Negocio

Este documento descreve as regras funcionais implementadas no codigo atual.

## 1) Multi-conta e autorizacao

- Cada user deve ter exatamente 1 conta pessoal valida.
- Operacoes financeiras sempre scoped por `accountId`.
- `X-Account-Id` e opcional; sem header usa conta pessoal do user.
- Se nao existir membership ativa para a conta, pedido falha com `ACCOUNT_ACCESS_DENIED`.

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
- Join por codigo cria/reativa membership do user com role default `viewer`.

## 4) Regras de ownership

- Conta partilhada nao pode ficar sem owner.
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
- `createTransaction` com `origin=manual` exige budget valido no `input.month`.
- `updateTransaction` de transacao manual valida mes final (se data mudar de mes).
- Sem budget valido, erro `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS` (422).

Transacoes recorrentes internas nao passam por este bloqueio.

## 7) totalBudget derivado de receitas

Fonte de verdade:
- soma de todas as transacoes `type=income` da conta+mes.

Sincronizacao:
- em `getBudget` (leitura): corrige divergencia se existir,
- em create/update/delete de transacao income: sincroniza budget do(s) mes(es) afetado(s),
- em `saveBudget` e `copyBudgetFromMonth`: total e calculado server-side.

## 8) Recorrencias

- Regra ativa para mes quando:
  - `active=true`
  - `startMonth <= month`
  - `endMonth` ausente ou `endMonth >= month`
- Geracao usa upsert por `(accountId, recurringRuleId, month)` para idempotencia.
- `dayOfMonth` e ajustado ao ultimo dia real do mes.

## 9) Stats

- Nao usam dados random no backend.
- Dados calculados em tempo real sobre transactions + budgets do periodo.
- `budgeted` por categoria e calculado com:
  - `% da categoria` x `income real do mes`.
- Retorna `categorySeries` para detalhe mensal por categoria.

## 10) Tutorial

- `tutorialSeenAt` em `User`.
- Se `null`, frontend pode iniciar tutorial automaticamente.
- `POST /auth/tutorial/complete` marca conclusao (skip/done).

## 11) Semantica temporal

- Chave mensal `YYYY-MM`.
- Backend usa UTC para derivacao de mes e datas de recorrencia.

