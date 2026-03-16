# README for AI Agents

Este documento e destinado a agentes de IA a trabalhar neste repositorio.

## 1) Missao do projeto

App de financas com multi-conta (`account/workspace`) e regras fortes de integridade:
- conta pessoal obrigatoria por user,
- conta partilhada com memberships e roles,
- orcamento mensal com `totalBudget` derivado de receitas,
- bloqueio de lancamentos manuais sem budget valido,
- stats deterministicas sem dados random no backend.

## 2) Mapa tecnico rapido

- Backend: `backend/src`
  - entrada: `server.ts`, `app.ts`
  - rotas: `routes/index.ts`
  - dominios: `modules/{auth,accounts,budgets,transactions,recurring,stats}`
  - modelos: `models/*`
- Frontend: `frontend/src`
  - entrada: `main.tsx`, `app/App.tsx`
  - layout global: `app/components/layout.tsx`
  - paginas: `month-page.tsx`, `stats-page.tsx`
  - estado/contextos: `app/lib/auth-context.tsx`, `account-context.tsx`
  - API client: `app/lib/http-client.ts`, `app/lib/api.ts`

## 3) Invariantes que NAO podem ser quebrados

1. `User.personalAccountId` deve existir e apontar para conta valida.
2. Conta pessoal deve ter membership ativa owner do proprio user.
3. Scoping financeiro por `accountId`, nao por `userId`.
4. `budget.totalBudget` e derivado de incomes do mes.
5. Lancamentos `origin=manual` exigem budget valido (`isReady=true`) no mes alvo.
6. Conta partilhada nao pode ficar sem owner ativo.
7. Datas mensais no backend sao processadas em UTC.

## 4) Contratos de API criticos

- Base path: `/api/v1`
- Endpoints protegidos usam `Authorization: Bearer ...`
- Endpoints financeiros usam `X-Account-Id` (fallback para conta pessoal se ausente)
- `PUT /budgets/:month` aceita `totalBudget` mas backend ignora

## 5) Fluxos sensiveis

### Auth register
Deve ser transacional:
- criar account pessoal
- criar membership owner
- criar user com `personalAccountId`

### Accounts membership/roles
Qualquer alteracao que possa afetar ownership:
- executar em transacao
- validar regra de ultimo owner dentro da transacao

### Transactions -> Budget sync
Ao criar/editar/apagar income:
- sincronizar `budget.totalBudget` do(s) mes(es) impactado(s)

## 6) Frontend: pontos de atencao

- Nao remover injecao de `X-Account-Id` no `http-client`.
- Nao regressar para mock por default (`VITE_USE_MOCK` default deve continuar `false`).
- UI usa tokens semanticos puros (`theme.css` base + `styles/themes/*.css`), sem classes de paleta hardcoded.
- Mudancas de tema exigem contrato `styles/themes/_template.css` consistente em todos os temas.
- `theme.css` nao pode conter cores literais.
- `dark:` e proibido no frontend.
- `npm run check-theme-contract` e obrigatorio antes de PR.
- `npm run check:tokens` deve permanecer verde (incluido no lint/CI).
- Tutorial auto apenas quando `tutorialSeenAt === null`.
- Tutorial por pagina, sem forcar navegacao de rota.
- Manter aviso desktop nao bloqueante.

## 7) Erros comuns e diagnostico

- `ACCOUNT_ACCESS_DENIED`
  - header `X-Account-Id` invalido ou membership inexistente/inativa
- `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS`
  - budget do mes sem 100%
- duplicados visuais de conta
  - memberships legadas duplicadas; backend deduplica por `accountId`

## 8) Comandos uteis

```bash
# backend
cd backend
npm run dev
npm run test
npm run migrate:accounts

# frontend
cd frontend
npm run dev
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
```

## 9) Boas praticas para mudancas

- Alterar contratos publicos so com update de docs e tipos frontend.
- Mudancas de UI devem cumprir `docs/frontend/ui-v3-spec.md`; novas regras visuais exigem update da spec + README relevante.
- Preferir testes de integracao para regras cross-module.
- Ao mexer em roles/permissoes, validar matrix owner/editor/viewer.
- Ao mexer em datas/mes, validar fronteiras UTC.
- Ao mexer em budget/transacoes/stats, garantir consistencia imediata na leitura.

## 10) Checklist de PR para agentes

- [ ] backend build + tests verdes
- [ ] frontend typecheck + lint + tests + build verdes
- [ ] docs atualizadas (`docs/` + README relevante)
- [ ] sem segredos em codigo
- [ ] invariantes acima mantidos
