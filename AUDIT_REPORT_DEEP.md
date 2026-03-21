# Deep Audit Report

## 1. Executive Summary

O repositório está, no geral, bem estruturado, com várias decisões corretas e deliberadas: registo transacional de utilizador + conta pessoal + membership, scoping financeiro por `accountId`, uso consistente de UTC nas funções centrais de mês, bloqueio real de lançamentos manuais sem budget válido, separação do fluxo base de stats face ao fluxo dedicado de insight IA, e guardrails explícitos para theming/tokens.

Mesmo assim, a auditoria encontrou problemas reais e relevantes em segurança, integridade de ownership, coerência docs↔código e cobertura de testes. O padrão dominante não é “código caótico”; é antes um código geralmente sólido, mas com alguns pontos críticos onde a integridade depende de contadores derivados, fluxos não atómicos e cobertura insuficiente em cenários concorrentes ou de borda.

### Avaliação global por área

- Arquitetura e boundaries: **Boa**, com alguns acoplamentos desnecessários no frontend.
- Backend core rules: **Boa**, mas com **alguns contratos e fluxos operacionais ainda divergentes**.
- Frontend core flows: **Boa**.
- Segurança: **Razoável**, mas com **defaults inseguros em misconfiguration**.
- Persistência / integridade: **Razoável**, com `activeOwnerCount` agora reconciliado transacionalmente nos fluxos de reativação.
- Testes / quality gates: **Insuficientes nas zonas mais sensíveis** de scheduler e algumas bordas operacionais.
- Documentação: **Boa mas com drift real e algumas ambiguidades internas**.
- Operação / risco futuro: **Razoável**, mas com debt latentemente perigosa.

### Top problemas por impacto

1. Defaults de ambiente estão relaxados para misconfiguration fora de localhost.

### Estado dos findings

| Finding                                                  | Estado                             | Nota curta                                                                      |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Rotação de refresh token vulnerável a race condition     | Corrigido                          | Implementado em transação com CAS sobre `currentRefreshJti`.                    |
| `activeOwnerCount` desalinhado em rejoin de owner antigo | Corrigido                          | Rejoin de owner agora reconcilia `activeOwnerCount` em transação.               |
| Resgate de convite não atómico                           | Corrigido                          | Claim do código activo agora é atómico via `activeInviteCodeId`.                |
| `totalCount`/`totalAmount` após cursor                   | Corrigido                          | Totais agora são calculados sobre o filtro completo, independente do cursor.    |
| `X-Account-Id` injectado em requests não account-scoped  | Corrigido                          | Allowlist no `httpClient`; `/auth/*` e `/accounts/*` ficaram fora.              |
| `getBudget()` não persiste correção de `totalBudget`     | Corrigido                          | A leitura agora reconcilia e persiste o valor derivado.                         |
| Defaults de ambiente perigosos                           | Aberto                             | Hardening insuficiente para ambientes quase-prod.                               |
| Guardrail de tokens exclui `src/imports/`                | Corrigido                          | Removida a exclusão especial; o scan já cobre o subtree por extensão.          |
| API de sessões usa `jti` para expor `sid`                | Corrigido                          | O contrato passou a expor `sid` como canónico; `jti` ficou como alias legado.   |
| Falta de testes automáticos para refresh/replay          | Corrigido                          | Coberto por `backend/src/tests/integration/auth-refresh.test.ts`.               |
| Falta de testes para reativação de memberships antigos   | Corrigido                          | Coberto por regressão em `backend/src/tests/integration/accounts-flow.test.ts`. |
| Falsa lacuna de testes em `/stats/insights`              | Corrigido no report                | A suite existe; o finding foi removido/ajustado.                                |
| Contradição documental em `POST /transactions`           | Corrigido                          | A secção agora tem um contrato canónico único para `POST /transactions`.        |

### Estado dos critérios obrigatórios da auditoria

- Registo garante criação transacional de user + conta pessoal + membership: **Confirmado**.
- Scoping financeiro está isolado por `accountId`: **Confirmado, com boa implementação backend**.
- `X-Account-Id` é exigido onde deve ser: **Confirmado no backend**.
- `X-Account-Id` não é enviado onde não deve: **Confirmado no frontend**.
- `totalBudget` nunca é tratado como input de verdade: **Confirmado no save/update path principal**.
- Transações manuais são bloqueadas sem budget válido: **Confirmado**.
- Proteção do último owner é real e transacional: **Confirmado**; a proteção existe e `activeOwnerCount` é reconciliado nos fluxos de reativação relevantes.
- Tratamento mensal/UTC é consistente: **Confirmado nas funções core auditadas**.
- Frontend injeta corretamente `X-Account-Id`: **Sim, apenas nos endpoints account-scoped**.
- Fluxos de stats/insights seguem o contrato documentado: **Confirmado no core flow**.
- Frontend respeita guardrails de tokens/theming: **Guardrails existem e os ficheiros auditados respeitam-nos; garantia repo-wide não ficou totalmente fechada**.
- Documentação está coerente com o código atual: **Não totalmente; há drift e ambiguidades reais**.

## 2. Methodology

### O que foi analisado

Foi feita uma auditoria estática profunda ao repositório, cruzando documentação técnica e implementação real.

### Documentação efetivamente lida

- `README_AGENTS.md`
- `README.md`
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
- `docs/frontend/design-tokens.md`
- `docs/frontend/ui-v3-spec.md`
- `docs/frontend/screens-flows.md`
- `docs/frontend/state-and-api.md`
- `docs/frontend/quality-testing.md`
- `docs/operations/deployment.md`
- `docs/operations/ci-cd.md`
- `docs/operations/runbooks.md`

### Implementação efetivamente lida

#### Backend

- `src/app.ts`
- `src/server.ts`
- `src/config/db.ts`
- `src/config/env.ts`
- `src/config/logger.ts`
- `src/lib/month.ts`
- `src/middleware/auth.ts`
- `src/middleware/account-context.ts`
- `src/middleware/metrics.ts`
- `src/middleware/error-handler.ts`
- `src/routes/index.ts`
- `src/jobs/scheduler.ts`
- `src/models/{user,account,account-membership,budget,transaction,auth-session,refresh-token,stats-snapshot,stats-insight,recurring-rule,income-category}.model.ts`
- `src/modules/{auth,accounts,budgets,transactions,recurring,stats,income-categories}/service.ts`
- `src/modules/{auth,accounts,budgets,transactions,recurring,stats,income-categories}/routes.ts` (quando aplicável)
- testes backend amostrados:
    - `auth-flow.test.ts`
    - `accounts-flow.test.ts`
    - `budget-transactions-flow.test.ts`

#### Frontend

- `frontend/package.json`
- `src/app/App.tsx`
- `src/app/routes.ts`
- `src/app/lib/http-client.ts`
- `src/app/lib/api.ts`
- `src/app/lib/auth-context.tsx`
- `src/app/lib/account-context.tsx`
- `src/app/lib/account-store.ts`
- `src/app/lib/token-store.ts`
- `src/app/lib/theme-preferences.tsx`
- `src/app/components/layout.tsx`
- `src/app/components/month-page.tsx`
- `src/app/components/stats-page.tsx`
- `src/app/components/stats-insights-page.tsx`
- `src/styles/theme.css`
- `scripts/check-tokens.mjs`
- `scripts/check-theme-contract.mjs`

### Como a auditoria foi feita

- Leitura e validação de invariantes críticas declaradas.
- Cruzamento docs ↔ código para confirmar ou refutar contratos.
- Inspeção de fluxos sensíveis: register, refresh, memberships/roles, budgets, transactions, recurring, stats, insights, theming e account context.
- Inspeção de testes existentes para perceber o que está realmente coberto e o que não está.
- Procura explícita de falhas de atomicidade, scoping indevido, drift documental, contadores derivados frágeis e contratos inconsistentes.

### Limitações

- Não houve execução local do projeto, nem QA manual de UI, nem carga concorrente real.
- Não houve acesso a dados reais de produção.
- Nem todos os componentes visuais do frontend foram lidos um a um; a auditoria frontend concentrou-se nos fluxos, contexts, router, API layer, guardrails e páginas críticas.
- A conformidade repo-wide de tokens/theming ficou **parcialmente verificada**: os guardrails existem e os ficheiros auditados respeitam os contratos, mas não houve varrimento integral de todo o frontend em runtime.

## 3. Findings

### [HIGH] Rotação de refresh token vulnerável a race condition

- Área: Backend
- Categoria: Segurança / Sessões / Concorrência
- Confiança: Alta
- Impacto: Alto
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/auth/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `refresh()`
        - `POST /auth/refresh`
    - comportamento observado
        - O fluxo lê o refresh token atual, valida-o, marca-o como revogado e cria o token seguinte sem transação e sem compare-and-swap atómico sobre o estado do token. Duas chamadas concorrentes com o mesmo refresh token podem passar as validações antes de uma delas persistir a revogação.
- Porque é um problema:
    - Sessões e refresh tokens são um boundary de segurança. Se o mesmo refresh token puder originar múltiplas rotações concorrentes, perdes a propriedade de cadeia linear e de one-time use efetivo.
- Cenário real de falha ou risco:
    - Dois separadores do browser, um cliente com retry agressivo, ou um atacante com replay de refresh token, disparam `POST /auth/refresh` quase em simultâneo. Ambas as chamadas podem emitir descendentes válidos antes da revogação ser observável entre elas.
- Recomendação:
    - Tornar a rotação atómica: update condicional do token ainda não revogado + criação do sucessor no mesmo bloco transacional, ou usar um único registo “current refresh token” por sessão com compare-and-swap.
- Risco de regressão:
    - Médio. Muda lógica sensível de sessão e precisa de testes concorrentes reais.
- Relação com docs/regras:
    - As docs assumem revogação/rotação consistente de sessões. A implementação não garante isso sob concorrência.
- Prioridade sugerida:
    - P0
- Estado actual:
    - Corrigido na implementação.

### [HIGH] `activeOwnerCount` pode ficar desalinhado quando um owner antigo é reativado por convite

- Área: Backend
- Categoria: Integridade de dados / Ownership
- Confiança: Alta
- Impacto: Alto
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/accounts/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `joinByInviteCode()`
        - `updateMemberRole()`
        - `removeMember()`
        - `leaveAccount()`
    - comportamento observado
        - `joinByInviteCode()` reativa memberships existentes com `status=active` e `leftAt=null`, mas não atualiza `Account.activeOwnerCount` quando o membership reativado já tinha `role="owner"`. A proteção de último owner usa `activeOwnerCount` como fonte operacional.
- Porque é um problema:
    - A regra “não deixar conta partilhada sem owner ativo” fica dependente de um contador derivado que pode ficar incorreto. A proteção continua a existir, mas passa a decidir com base num valor potencialmente errado.
- Cenário real de falha ou risco:
    - Um owner sai da conta, fica `inactive`, é reativado mais tarde por convite e volta como `owner`. A conta passa a ter 2 owners ativos, mas `activeOwnerCount` pode continuar a 1. Daí em diante, demover/remover/sair pode ser bloqueado de forma errada e gerar deadlocks operacionais de gestão de membros.
- Recomendação:
    - Reconciliar `activeOwnerCount` sempre que há reativação de membership, ou abandonar o contador como fonte de verdade e calcular owners ativos dentro da transação.
- Risco de regressão:
    - Médio. Toca no modelo operativo de ownership.
- Relação com docs/regras:
    - As docs dizem que a conta partilhada não pode ficar sem owner ativo. A implementação da proteção existe, mas pode operar sobre estado derivado desalinhado.
- Prioridade sugerida:
    - P0
- Estado actual:
    - Corrigido na implementação.

### [MEDIUM] Resgate de convite não é atómico face a revogação/rotação do código

- Área: Backend
- Categoria: Segurança / Concorrência / Convites
- Confiança: Média
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/accounts/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `joinByInviteCode()`
        - `generateInviteCode()`
    - comportamento observado
        - `joinByInviteCode()` valida `invite.revokedAt`, `invite.expiresAt` e `account.activeInviteCodeId`, mas faz essas leituras e o upsert de membership fora de transação. `generateInviteCode()` revoga o anterior e promove o novo dentro de transação.
- Porque é um problema:
    - Há uma janela TOCTOU. Um código pode ser considerado válido pela leitura em `joinByInviteCode()` e ser revogado logo a seguir, antes da escrita do membership.
- Cenário real de falha ou risco:
    - O owner regenera o código de convite ao mesmo tempo que outro utilizador submete o código antigo. O pedido de join pode entrar com um código que o owner já pretendia invalidar.
- Recomendação:
    - Fazer validação do convite e criação/reativação do membership no mesmo contexto transacional, com revalidação final do código ativo.
- Risco de regressão:
    - Médio.
- Relação com docs/regras:
    - As docs assumem que novo código revoga os anteriores. Em concorrência, essa garantia não é estrita.
- Prioridade sugerida:
    - P1
- Estado actual:
    - Corrigido na implementação.

### [MEDIUM] `totalCount` e `totalAmount` da listagem de transações são calculados depois do cursor

- Área: Backend
- Categoria: Contrato API / Paginação
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/transactions/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `listTransactions()`
        - `GET /transactions?...cursor=...`
    - comportamento observado
        - O mesmo `filter` com `cursor` é usado tanto para `find()` paginado como para o `aggregate()` que calcula `totalCount` e `totalAmount`.
- Porque é um problema:
    - O contrato da API sugere totais do conjunto filtrado. A implementação devolve totais apenas da “cauda” a partir do cursor atual.
- Cenário real de falha ou risco:
    - A UI mostra “12 movimentos” na segunda página, quando na verdade existem 57 para o filtro completo. Totais e UX de paginação ficam enganadores.
- Recomendação:
    - Separar `baseFilter` (filtro lógico) de `pageFilter` (filtro lógico + cursor). O aggregate deve usar apenas `baseFilter`.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - Diverge do contrato implícito da listagem paginada documentada.
- Prioridade sugerida:
    - P1
- Estado actual:
    - Corrigido na implementação.

### [MEDIUM] O frontend envia `X-Account-Id` em todos os pedidos autenticados, não só nos account-scoped

- Área: Frontend
- Categoria: Contrato API / Boundary / Acoplamento
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `frontend/src/app/lib/http-client.ts`
    - função(ões)/rota(s)/componente(s)
        - interceptor de request do `httpClient`
    - comportamento observado
        - O header `X-Account-Id` é sempre anexado quando existe conta ativa, independentemente do endpoint ser `/auth/*`, `/accounts/*` ou account-scoped.
- Porque é um problema:
    - Aumenta o acoplamento implícito entre estado global de conta e endpoints que não deviam depender desse contexto. Mesmo que a implementação seja funcional, o contrato fica mais frágil e menos previsível.
- Cenário real de falha ou risco:
    - Um endpoint futuro de auth/accounts começa a interpretar ou validar `X-Account-Id` sem o frontend ter sido desenhado para isso. Surge um bug transversal difícil de detetar.
- Recomendação:
    - Ou restringir a injeção a endpoints account-scoped, ou tornar explícito no contrato que o header é sempre presente quando há conta ativa.
- Risco de regressão:
    - Baixo a médio.
- Relação com docs/regras:
    - A documentação está inconsistente: `docs/frontend/state-and-api.md` descreve injeção em requests account-scoped, enquanto `docs/frontend/README.md` diz que todas as chamadas autenticadas injetam `X-Account-Id`.
- Prioridade sugerida:
    - P2
- Estado actual:
    - Corrigido na implementação.
- Estado actual:
    - Corrigido na implementação.

### [MEDIUM] `getBudget()` não corrige a divergência persistida de `totalBudget` apesar de a documentação o afirmar

- Área: Backend
- Categoria: Drift docs↔código / Fonte de verdade
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/budgets/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `getBudget()`
        - `GET /budgets/:month`
    - comportamento observado
        - `getBudget()` recalcula `totalBudget` a partir das receitas, persiste a correção quando deteta drift e devolve esse valor no response.
- Porque é um problema:
    - A API deixa de parecer consistente apenas no response: a BD também é reconciliada. Qualquer consumidor interno, export ou leitura direta à coleção passa a ver o `totalBudget` corrigido.
- Cenário real de falha ou risco:
    - Um script operacional, export futuro ou job que leia `budgets.totalBudget` diretamente usa um valor desatualizado, enquanto o endpoint GET aparenta estar “correto”.
- Recomendação:
    - Corrigir o código para persistir a correção em leitura.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - A regra “`totalBudget` é derivado” mantém-se e a promessa de “corrigir divergência em leitura” passa a estar implementada.
- Prioridade sugerida:
    - P2

### [MEDIUM] Defaults de ambiente tornam misconfiguration demasiado perigosa

- Área: Backend / Operação
- Categoria: Segurança / Hardening
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/config/env.ts`
        - `backend/src/app.ts`
    - função(ões)/rota(s)/componente(s)
        - `env`
        - `createApp()` (`trust proxy`)
    - comportamento observado
        - Em ambientes não-prod, a app aceita defaults como `dev-access-secret`, `dev-refresh-secret`, Mongo local e `TRUST_PROXY="1"`.
- Porque é um problema:
    - O hardening depende fortemente de `NODE_ENV=production` estar corretamente configurado. Um preview/staging/deploy mal configurado pode expor uma app publicamente com segredos previsíveis e confiança indevida em proxy headers.
- Cenário real de falha ou risco:
    - Um deploy em Render/Vercel/Fly com `NODE_ENV` errado ou incompleto entra online com JWT secrets triviais e cadeia de IP/proxy assumida por defeito.
- Recomendação:
    - Falhar fechado fora de localhost quando segredos estão em default, e tornar `TRUST_PROXY` explícito por ambiente.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - As docs de produção estão corretas, mas o comportamento default continua demasiado permissivo para ambientes “quase-prod”.
- Prioridade sugerida:
    - P2

### [MEDIUM] O guardrail de tokens deixa `src/imports/` fora da verificação

- Área: Frontend
- Categoria: Quality gate / Theming
- Confiança: Média
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `frontend/scripts/check-tokens.mjs`
        - existência de `frontend/src/imports/` no repositório
    - função(ões)/rota(s)/componente(s)
        - `check:tokens`
    - comportamento observado
        - O script já não exclui explicitamente paths que contenham `/imports/`; o subtree passou a ser tratado como qualquer outro `src/` com extensões suportadas.
        - No estado atual, o diretório contém documentação/imports de referência, não código runtime.
- Porque é um problema:
    - O contrato de theming quer garantir ausência de cores hardcoded fora dos temas. Um diretório de source excluído enfraquece a confiança nesse gate.
- Cenário real de falha ou risco:
    - Um componente ou asset CSS/TSX em `src/imports/` introduz classes hardcoded ou cores literais e passa despercebido ao guardrail e à CI.
- Recomendação:
    - Incluir `src/imports/` no scan, ou documentar claramente porque é um diretório não-runtime e garantir isso estruturalmente.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - As docs apresentam `check:tokens` como guardrail abrangente; o código agora está alinhado com esse contrato.
- Prioridade sugerida:
    - P2
- Estado actual:
    - Corrigido na implementação.

### [LOW] A API de sessões usa o nome `jti` para expor o `sid` da sessão

- Área: Backend
- Categoria: Contrato API / Naming
- Confiança: Alta
- Impacto: Baixo
- Evidência:
    - ficheiro(s)
        - `backend/src/modules/auth/service.ts`
    - função(ões)/rota(s)/componente(s)
        - `listSessions()`
        - `revokeSession()`
        - `DELETE /auth/sessions/:sid` (o nome `:jti` apareceu no contrato legado)
    - comportamento observado
        - A listagem expõe `sid` como identificador canónico e mantém `jti` apenas como alias legado; o endpoint revoga pelo `sid` da sessão, não pelo `jti` de um refresh token.
- Porque é um problema:
    - Mistura dois conceitos de segurança diferentes: identificador de sessão e identificador de token.
- Cenário real de falha ou risco:
    - Um cliente integra a API assumindo que está a manipular JTIs de refresh token, quando na verdade está a operar sobre SIDs de sessão.
- Recomendação:
    - Renomear o campo/param para `sid`, ou documentar explicitamente que `jti` é apenas naming legacy e representa a sessão.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - A documentação atual reforça a ambiguidade em vez de a resolver.
- Prioridade sugerida:
    - P3
- Estado actual:
    - Corrigido na documentação.
- Estado actual:
    - Corrigido na implementação.

### [MEDIUM] Não há evidência de testes automáticos para concorrência/replay no refresh token

- Área: Testes / Segurança
- Categoria: Coverage gap
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/tests/integration/auth-flow.test.ts`
    - função(ões)/rota(s)/componente(s)
        - suite de auth amostrada
    - comportamento observado
        - A suite amostrada cobre `register -> login -> me -> tutorial`, mas não cobre `POST /auth/refresh`, reuse de refresh token, refresh concorrente, nem revogação por replay.
- Porque é um problema:
    - O código de sessão é uma das zonas mais sensíveis do backend e precisamente uma das que tem mais risco concorrente.
- Cenário real de falha ou risco:
    - Uma regressão ou race condition na rotação de refresh token entra em produção sem qualquer alarme na CI.
- Recomendação:
    - Adicionar integração para refresh normal, refresh repetido com o mesmo token, refresh concorrente e refresh após revogação.
- Risco de regressão:
    - Baixo ao nível funcional; alto benefício de cobertura.
- Relação com docs/regras:
    - O projeto documenta sessões/revogação, mas a cobertura amostrada não prova esses contratos.
- Prioridade sugerida:
    - P1

### [MEDIUM] Não há evidência de testes para reativação de memberships antigos e consistência de owners

- Área: Testes / Accounts
- Categoria: Coverage gap
- Confiança: Alta
- Impacto: Médio
- Evidência:
    - ficheiro(s)
        - `backend/src/tests/integration/accounts-flow.test.ts`
    - função(ões)/rota(s)/componente(s)
        - suite de accounts amostrada
    - comportamento observado
        - A suite cobre `invite -> join` de membro novo, promoção, escrita por role e leave, mas não cobre rejoin de membership já existente/inativo, muito menos rejoin de antigo owner.
- Porque é um problema:
    - O bug encontrado em `activeOwnerCount` vive precisamente nesse espaço não coberto.
- Cenário real de falha ou risco:
    - A CI continua verde enquanto a regra crítica de ownership se degrada em casos reais de saída e reentrada.
- Recomendação:
    - Criar casos para: owner sai, é reativado, owner antigo volta por convite, e validação posterior de demote/remove/leave.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - A regra “último owner” é crítica e merece cobertura explícita nos cenários de reativação.
- Prioridade sugerida:
    - P1

### [LOW] A documentação do `POST /transactions` é internamente contraditória

- Área: Documentação
- Categoria: Drift intra-doc
- Confiança: Alta
- Impacto: Baixo
- Evidência:
    - ficheiro(s)
        - `docs/backend/api-reference.md`
    - função(ões)/rota(s)/componente(s)
        - secção inicial de Transactions
        - secção detalhada posterior de `POST /transactions`
    - comportamento observado
        - Numa parte, a doc diz que `origin` e `recurringRuleId` deixaram de ser aceites no contrato público. Mais abaixo, o exemplo de request volta a incluir `origin: "manual"`.
- Porque é um problema:
    - Gera dúvida sobre o contrato público real e induz clientes a enviar campos que a API já não quer assumir como input de verdade.
- Cenário real de falha ou risco:
    - Um consumidor integra pelo exemplo mais abaixo e constrói suposições erradas sobre a semântica de criação manual.
- Recomendação:
    - Unificar a doc e manter um único contrato canónico para `POST /transactions`.
- Risco de regressão:
    - Baixo.
- Relação com docs/regras:
    - É drift documental puro, mas suficientemente concreto para confundir integração.
- Prioridade sugerida:
    - P3

## 4. Coverage Gaps

- Não foi feita execução local do backend/frontend; problemas dependentes de runtime, browser quirks ou Mongo topology real ficam parcialmente não verificados.
- Não foi feito teste concorrente real contra `POST /auth/refresh` ou scheduler; o join por convite ficou coberto por regressão determinística de código obsoleto após rotação.
- Não foi feita verificação manual do comportamento visual de todos os componentes frontend.
- Não foi auditado cada ficheiro de teste do repositório; foi feita amostragem orientada pelas áreas críticas.
- A suspeita inicial de falta de testes para `StatsInsightsPage` não se confirmou: existe uma suite dedicada com polling, falhas e retoma manual.
- Não ficou provada repo-wide a inexistência absoluta de hardcoded colors/`dark:` fora dos ficheiros auditados; os guardrails existem, mas a verificação integral do frontend ficou incompleta.
- Não foi validado com dados reais o comportamento de export, delete account e snapshots históricos.
- Não foi confirmada a presença/ausência de dependências cíclicas por grafo automático; a conclusão arquitetural aqui resulta de leitura estrutural e não de tooling de graph analysis.

## 5. Contradictions / Drift Matrix

| Regra / contrato documentado                                                          | Onde está documentado               | Onde é implementado                                                                                                    | Estado    |
| ------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| Registo cria user + conta pessoal + membership owner de forma transacional            | docs de backend, regras de negócio  | `auth/service.ts -> register()`                                                                                        | OK        |
| Endpoints financeiros exigem `X-Account-Id`                                           | docs backend/frontend               | routers financeiros + `requireStrictAccountContext`                                                                    | OK        |
| `X-Account-Id` deve existir apenas nos endpoints financeiros/account-scoped           | docs backend/frontend               | `http-client` agora usa allowlist de rota e docs foram alinhados                                                       | OK        |
| `PUT /budgets/:month` aceita `totalBudget`, mas backend ignora                        | docs backend                        | `budgets/service.ts -> saveBudget()`                                                                                   | OK        |
| `totalBudget` é derivado das receitas e sincronizado no save/update/delete de incomes | docs backend                        | `budgets/service.ts`, `transactions/service.ts`                                                                        | OK        |
| `getBudget` corrige divergência de `totalBudget` em leitura                           | docs backend business rules         | `budgets/service.ts -> getBudget()` reconcilia e persiste o valor                                                     | OK        |
| Conta partilhada não pode ficar sem owner ativo                                       | docs backend/domain model           | proteção existe em `updateMemberRole/removeMember/leaveAccount/deleteMe` e `activeOwnerCount` é reconciliado no rejoin | OK        |
| Abrir `/stats` não dispara insight IA automaticamente                                 | docs frontend/backend               | `StatsPage` navega para `/stats/insights`; `StatsInsightsPage` só gera por clique                                      | OK        |
| `theme.css` não deve conter cores literais                                            | docs design tokens/UI v3            | ficheiro auditado `src/styles/theme.css` cumpre                                                                        | OK        |
| Guardrails de tema/tokens cobrem o frontend                                           | docs frontend quality/design tokens | `check:tokens` cobre todo o `src/` com extensões suportadas                                                           | OK        |
| CI corre smoke E2E de frontend                                                        | docs CI/CD                          | workflow `.github/workflows/ci.yml` inclui `frontend-e2e-smoke`                                                        | OK        |
| Contrato público de `POST /transactions` não aceita `origin`                          | docs backend api-reference          | a secção de `POST /transactions` agora lista só campos canónicos de input                                                 | OK        |

## 6. Test Gap Matrix

| Área funcional                               | Existe unit?   | Existe integration? | Existe E2E?    | Gap principal                                                        | Risco do gap |
| -------------------------------------------- | -------------- | ------------------- | -------------- | -------------------------------------------------------------------- | ------------ |
| Refresh token rotation / replay              | Sim            | Sim                 | N/A            | Coberto por testes de cookie, body, replay e concorrência            | Baixo        |
| Rejoin de membership antigo / owner count    | Não            | Sim                 | Não verificado | Coberto por regressão; sem E2E                                       | Baixo        |
| Paginação `GET /transactions` com cursor     | Não            | Sim                 | Não verificado | Regressão cobre paginação e totais do filtro completo                | Baixo        |
| Guardrail repo-wide de hardcoded colors      | Sim            | Sim                 | N/A            | `src/imports/` agora entra no scan por extensão                        | Baixo        |
| Scheduler multi-instância / perda de lease   | Não verificado | Não verificado      | N/A            | Falta prova automatizada de comportamento sob corrida real           | Médio        |
| Ownership transacional em cenários de borda  | Parcial        | Parcial             | N/A            | Há cobertura de leave/promote/remove, mas não de rejoin/reactivation | Médio        |
| Logout / revoke / refresh family consistency | Não verificado | Parcial             | Não verificado | Falta ainda provar coerência completa da família de sessão/tokens    | Médio        |

## 7. Prioritized Remediation Roadmap

### Fase 1: corrigir riscos críticos e de integridade

1. Adicionar testes de integração para scheduler.
2. Fechar os contratos que ainda estão em drift entre API, docs e frontend.
3. Reforçar a observabilidade dos fluxos concorrentes restantes.

### Fase 2: corrigir inconsistências estruturais e contratuais

1. Reforçar hardening de env para falhar fechado fora de localhost.

### Quick wins

- Guardrail de tokens já cobre `src/imports/` por extensão.

### Mudanças estruturais

- Rework do modelo de ownership já não é bloqueador imediato; o contador é reconciliado no rejoin e os guards existentes continuam válidos.
- Suite de testes concorrentes continua útil para refresh e scheduler.

## 8. Final Verdict

O repositório **não está num estado “mau”**. Há várias decisões corretas e, em muitos pontos, o projeto está acima do nível típico de uma app fullstack pequena: invariantes foram pensadas, docs existem, o backend separa bem responsabilidades e o frontend tem guardrails explícitos de design/tokens.

Mas também **não está pronto para evolução segura sem correções prioritárias**.

Os principais bloqueadores são:

1. cobertura de testes ainda insuficiente nos fluxos de scheduler e hardening.
2. defaults de ambiente e guardrails ainda exigem endurecimento.

### Veredicto final

- Estado global do repositório: **Razoavelmente sólido, mas com riscos reais não aceitáveis para evolução confiante sem intervenção**.
- Pronto para evolução segura: **Não, ainda não**.
- Principais bloqueadores: **test gaps em scheduler/hardening**, **defaults de ambiente**.
