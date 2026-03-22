# Gap Audit Report

## 1. Executive Summary

O repositório aparenta estar **forte nas cadeias principais**, com evidência sólida de entrega em auth, multi-conta, budgets, transactions, recurring, stats base, stats insights dedicada, tutorial e theming. Isso vê-se na montagem real das rotas backend, no router frontend, na árvore de páginas/componentes e na matriz de testes existente.

Ao mesmo tempo, **não o classificaria como “completamente fechado”**. Os gaps mais relevantes que encontrei não estão tanto nas features core documentadas, mas em quatro zonas: **drift documental**, **cobertura insuficiente de features operacionais/auxiliares**, **evidência fraca de fecho de alguns fluxos UI menos centrais**, e **sinais residuais/stale do projeto**. Em particular, há documentação que ainda anuncia capacidades já removidas ou já reformuladas, endpoints/flows secundários documentados sem cobertura explícita nos testes publicados, e sinais de backlog antigo que já não batem certo com o estado atual.

Avaliação global: **parcialmente completo, com gaps relevantes de completude documental e de verificação operacional**, mas sem evidência forte, a partir do material acessível, de que as funcionalidades principais listadas estejam em falta por completo.

## 1.1 Follow-up Status

Este report preserva a leitura original do audit, mas o workspace já recebeu um pass de implementação posterior que fechou grande parte dos gaps acima. Em concreto:

- `VITE_USE_MOCK` foi removido do onboarding/documentação de topo.
- O inventário de temas do `frontend/README.md` foi alinhado com os 7 temas oficiais.
- `TODO.md` foi removido por ser ruído residual.
- O metadata do frontend foi normalizado para refletir o projeto real.
- Foram adicionados testes para observability, scheduler, stats auxiliares, budgets auxiliares e fluxos UI de shared accounts e profile.

O restante texto abaixo deve ser lido como o baseline original do audit, não como o estado atual do workspace.

## 2. Methodology

Li e cruzei a documentação oficial carregada no workspace com o código e metadados publicamente acessíveis no GitHub: README de topo, READMEs de backend/frontend, `backend/package.json`, `frontend/package.json`, `backend/src/routes/index.ts`, `frontend/src/app/routes.ts`, `frontend/` tree, `backend/src/` tree, árvores de testes backend e workflow CI.

A comparação foi feita em duas direções: **docs -> código** e **código -> docs/testes/CI**. Sempre que consegui confirmar a cadeia por evidência pública, tratei como entregue; quando a feature estava documentada mas sem evidência suficiente no código acessível, ou sem cobertura explícita nos testes publicados, marquei como `PARTIAL` ou `UNCLEAR` em vez de assumir que estava pronta.

Limitações: não consegui clonar o repositório no container por falha de resolução DNS, e a navegação profunda em alguns ficheiros GitHub teve falhas intermitentes de fetch. Por isso, alguns checks operacionais e alguns ficheiros internos foram apenas **parcialmente verificáveis**; nesses casos, marquei explicitamente como não verificados.

## 3. Missing / Pending Features

### [DOC_DRIFT] README de topo ainda documenta `VITE_USE_MOCK`, mas o frontend oficial já não o trata como capacidade ativa
- Área: frontend / setup
- Tipo: documentation drift
- Estado: doc_drift
- Confiança: alta
- Evidência documental: o README de topo manda criar `frontend/.env` com `VITE_USE_MOCK=false` e volta a listar `VITE_USE_MOCK` como variável crítica.
- Evidência no código: o setup/config oficial do frontend já descreve a app como modo único com API real; o `frontend/README.md` lista apenas `VITE_API_BASE_URL` e `VITE_MAINTENANCE_MODE` como config mínima.
- O que existe: configuração real API e maintenance mode.
- O que falta: alinhamento documental; a capacidade mock já não está apresentada como parte do frontend oficial.
- Porque concluo que está pendente/incompleto: há duas fontes oficiais a dizer coisas diferentes sobre o setup real.
- Impacto prático: onboarding enganador, `.env` desnecessário, falsas expectativas de modo mock.
- Dependências relacionadas: `frontend/.env`, docs de setup.
- Testes existentes: não aplicável.
- Prioridade sugerida: média.

### [DOC_DRIFT] README do frontend ficou com inventário de temas desatualizado
- Área: frontend / theming
- Tipo: documentation drift
- Estado: doc_drift
- Confiança: alta
- Evidência documental: o `frontend/README.md` diz que há um ficheiro por tema e enumera apenas `brisa`, `calma`, `aurora`, `terra`.
- Evidência no código: o contrato oficial e as docs funcionais suportam sete temas: `brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`; o backend também aceita esse enum.
- O que existe: sistema de temas com sete IDs canónicos.
- O que falta: README alinhado com o contrato real.
- Porque concluo que está pendente/incompleto: há mismatch direto entre README frontend e design tokens/estado/API.
- Impacto prático: drift para devs, prompts e QA; risco de tratar 3 temas válidos como “inexistentes”.
- Dependências relacionadas: `theme-preferences`, guardrails de tema/tokens.
- Testes existentes: contrato de tema e palette estão documentados como existentes.
- Prioridade sugerida: média.

### [UNUSED] `TODO.md` parece residual e contradiz o estado documentado atual
- Área: raiz do projeto
- Tipo: documentation drift
- Estado: unused
- Confiança: alta
- Evidência documental: `TODO.md` ainda lista “Perfil (opção de cores, temas, etc)” e “Remover drop down de escolha de orçamento se não existir partilha...”.
- Evidência no código: o perfil já está dividido em subpáginas dedicadas, incluindo preferências/tema, e a visibilidade contextual do seletor de conta já faz parte da arquitetura/flows oficiais e tem teste dedicado de layout/account select.
- O que existe: capacidade documentada e, em parte, testada.
- O que falta: limpeza do backlog residual.
- Porque concluo que está pendente/incompleto: o ficheiro deixou de ser fonte fiável e passa a ser ruído técnico.
- Impacto prático: falsa sensação de trabalho pendente ou incerteza sobre o estado real.
- Dependências relacionadas: docs de frontend e testes de layout.
- Testes existentes: `layout.account-select.test.tsx` existe no inventário.
- Prioridade sugerida: baixa.

### [PARTIAL] Health/ready/metrics estão documentados como críticos, mas não têm cobertura automática visível
- Área: backend / operabilidade
- Tipo: test coverage
- Estado: partial
- Confiança: alta
- Evidência documental: os endpoints `/health`, `/ready` e `/metrics` são tratados como endpoints formais e operacionais.
- Evidência no código: a árvore de testes backend publicada só mostra suites para auth, accounts, budget/transactions, income categories, profile, recurring e stats; não aparece nenhuma suite dedicada a health/readiness/metrics.
- O que existe: documentação, dependência `prom-client`, e CI backend normal.
- O que falta: evidência de verificação automática destes contratos operacionais.
- Porque concluo que está pendente/incompleto: para endpoints de observabilidade, ausência de testes/smoke dedicados deixa a entrega operacional menos “done”.
- Impacto prático: risco de deploy aparentemente verde com readiness/metrics quebrados.
- Dependências relacionadas: `app.ts`, infraestrutura, load balancer.
- Testes existentes: não visíveis no inventário publicado.
- Prioridade sugerida: alta.

### [PARTIAL] Scheduler existe, mas não há evidência de verificação automática do job nem da sua ligação no arranque
- Área: backend / job-scheduler
- Tipo: job/scheduler
- Estado: partial
- Confiança: média
- Evidência documental: o scheduler é um componente formal, com `scheduler.ts`, cron diária, lease distribuída e arranque a partir de `server.ts`.
- Evidência no código: a árvore mostra `backend/src/jobs/scheduler.ts`, mas o inventário de testes unit/integration não mostra nenhuma suite dedicada ao scheduler ou ao bootstrap operacional.
- O que existe: ficheiro do job e documentação detalhada.
- O que falta: evidência pública de testes/smoke para o job e confirmação automática da ligação `server -> startScheduler`.
- Porque concluo que está pendente/incompleto: para uma capacidade de background crítica, a ausência de verificação publicada deixa a feature operacional menos fechada.
- Impacto prático: job silenciosamente desligado, misfire de recorrências, deriva entre docs e runtime.
- Dependências relacionadas: recorrências, deploy, `CRON_ENABLED`, `TIMEZONE`.
- Testes existentes: apenas `recurring-due-date.test.ts` e flow de fallback recorrente; não validam o scheduler como runtime component.
- Prioridade sugerida: alta.

### [PARTIAL] Endpoints auxiliares de stats estão documentados, mas sem cobertura explícita no inventário publicado
- Área: backend / stats
- Tipo: endpoint
- Estado: partial
- Confiança: média
- Evidência documental: a API referencia explicitamente `GET /stats/compare-budget` e `GET /stats/insights/latest`.
- Evidência no código: no inventário de testes backend publicado só aparecem `stats-category-series.test.ts` e `stats-insight-fallback.test.ts`; não há suite nomeada para compare-budget ou latest-insight.
- O que existe: módulo `stats` montado no backend e docs detalhadas.
- O que falta: evidência de cobertura/fecho destes endpoints auxiliares.
- Porque concluo que está pendente/incompleto: endpoints documentados e “vendidos” como parte da API sem prova pública equivalente de robustez.
- Impacto prático: regressões silenciosas em integrações secundárias/backoffice/debug.
- Dependências relacionadas: `stats` backend, insights, UI dedicada.
- Testes existentes: apenas subset das capacidades de stats.
- Prioridade sugerida: média.

### [PARTIAL] Endpoints auxiliares de budget não têm evidência pública de cobertura específica
- Área: backend / budgets
- Tipo: endpoint
- Estado: partial
- Confiança: média
- Evidência documental: docs expõem `GET /budgets/templates`, `POST /budgets/:month/categories`, `DELETE /budgets/:month/categories/:categoryId` e `POST /budgets/:month/copy-from/:sourceMonth`.
- Evidência no código: o inventário backend só explicita `budget-transactions-flow.test.ts` e os unit tests de validação, sem suite nomeada para templates/copy/remove/protected category.
- O que existe: módulo `budgets` montado e budget editor/frontend route real.
- O que falta: evidência pública de fecho dos endpoints auxiliares do budget.
- Porque concluo que está pendente/incompleto: a cadeia principal de budget existe, mas a superfície total documentada do módulo parece menos verificada do que a docs sugerem.
- Impacto prático: bugs em copy/template/remove podem passar sem serem apanhados.
- Dependências relacionadas: budget editor, transactions sync, recurring fallback.
- Testes existentes: coverage parcial.
- Prioridade sugerida: média.

### [PARTIAL] Fluxos frontend de shared accounts além de “members” têm cobertura estrutural, mas prova comportamental desigual
- Área: frontend / shared accounts
- Tipo: page
- Estado: partial
- Confiança: média
- Evidência documental: há rotas reais para `/profile/shared/accounts`, `/profile/shared/create`, `/profile/shared/join`, `/profile/shared/members`.
- Evidência no código: os ficheiros dessas páginas existem na árvore, mas o inventário de testes frontend publicado dá visibilidade direta apenas a `profile-shared-members-page.test.tsx` e ao teste do seletor de conta no layout; não aparecem suites dedicadas para create/join/accounts.
- O que existe: rotas, componentes e backend accounts-flow.
- O que falta: evidência frontend equivalente para create/join/accounts/leave/switch.
- Porque concluo que está pendente/incompleto: o backend parece fechado, mas a camada UI destes subfluxos está menos provada do que o resto da app.
- Impacto prático: UX quebrada ou regressões silenciosas em partilha/membership apesar de API estar correta.
- Dependências relacionadas: `AccountProvider`, router, `/accounts` backend.
- Testes existentes: `accounts-flow.test.ts` backend; `profile-shared-members-page.test.tsx` frontend.
- Prioridade sugerida: média.

### [PARTIAL] Subpáginas de perfil estão entregues em routing, mas a evidência frontend publicada é mais fraca do que a docs sugerem
- Área: frontend / profile
- Tipo: page
- Estado: partial
- Confiança: média
- Evidência documental: existem rotas e responsabilidades dedicadas para `/profile/account`, `/profile/security`, `/profile/preferences`.
- Evidência no código: os ficheiros dessas páginas existem na árvore, mas o inventário de testes frontend não mostra suites dedicadas para essas páginas; a validação visível está mais concentrada em layout/status/stats/tutorial e alguns contratos UI.
- O que existe: routing e backend `profile-flow.test.ts`.
- O que falta: evidência frontend direta para os fluxos de perfil.
- Porque concluo que está pendente/incompleto: a docs transmite uma sensação de fecho UI mais forte do que a evidência publicada de testes/frontend.
- Impacto prático: bugs de formulário, estados loading/error, ou ações destrutivas mal ligadas podem escapar.
- Dependências relacionadas: `AuthProvider`, account/profile/security pages.
- Testes existentes: backend `profile-flow.test.ts`; frontend não explícito no inventário.
- Prioridade sugerida: média.

## 4. End-to-End Gap Matrix

| Fluxo | UI | Estado/Contexto | API Client | Endpoint | Service | Persistência | Testes | Estado final |
|---|---|---|---|---|---|---|---|---|
| Registo/login/logout/refresh | OK | OK | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`auth-flow`, `auth-refresh`) | OK |
| Conta pessoal + owner membership | n/a | n/a | n/a | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`auth-flow`, `accounts-flow`) | OK |
| Conta ativa + `X-Account-Id` | PARTIAL | OK | PARTIAL | OK | NOT_VERIFIED | n/a | PARTIAL (`layout.account-select`, `http-client.test.ts` no inventário/tree) | PARTIAL |
| Budgets + sync de incomes | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`budget-transactions-flow`) | OK |
| Bloqueio manual sem budget válido | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`budget-transactions-flow`) | OK |
| Income categories | PARTIAL | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`income-categories-flow`) | OK |
| Recurring rules / generate / reassign | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`recurring-fallback-flow`) | OK |
| Stats por período | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`stats-category-series`) | OK |
| Stats insights dedicada | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`stats-insight-fallback` backend + página/teste frontend visíveis) | OK |
| Tutorial month/stats | OK | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | OK (`tutorial-tour.test.tsx`) | OK |
| Sessions / revoke / revoke-all | PARTIAL | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | PARTIAL (`profile-flow`) | PARTIAL |
| Export user data | PARTIAL | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | PARTIAL (`profile-flow`) | PARTIAL |
| Delete/deactivate account | PARTIAL | PARTIAL | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | PARTIAL (`profile-flow`) | PARTIAL |
| Shared accounts create/join/members/leave/roles | PARTIAL | OK | PARTIAL | OK | NOT_VERIFIED | NOT_VERIFIED | PARTIAL (`accounts-flow` backend; frontend tests visíveis só para members/layout) | PARTIAL |
| Health / ready / metrics | n/a | n/a | n/a | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | MISSING visível | PARTIAL |
| Scheduler | n/a | n/a | n/a | n/a | NOT_VERIFIED | NOT_VERIFIED | MISSING visível | NOT_VERIFIED |
| Theme system / guardrails | OK | OK | n/a | n/a | n/a | n/a | OK (scripts + CI + tests) | OK |
| Scripts docs / setup / CI | PARTIAL | n/a | n/a | n/a | n/a | n/a | OK | PARTIAL |

## 5. Documentation vs Implementation Matrix

| Funcionalidade/serviço | Onde está documentado | Onde está implementado | Estado | Nota |
|---|---|---|---|---|
| Base routes backend (`auth/accounts/...`) | API/backend docs | `backend/src/routes/index.ts` | OK | Montagem bate certo. |
| Rotas principais frontend | frontend docs/screens-flows | `frontend/src/app/routes.ts` | OK | Inclui `/stats/insights` e alias recorrências. |
| Mock mode frontend | README topo | não confirmado como capacidade ativa; docs oficiais já não o tratam | DOC_DRIFT | Drift documental. |
| Inventário de temas | frontend README vs design tokens | sistema suporta 7 IDs canónicos | DOC_DRIFT | README incompleto. |
| Health/ready/metrics | docs backend/ops | implementação não lida diretamente; testes não visíveis | PARTIAL | Operacionalmente subverificado. |
| Scheduler | docs ops/backend overview | `backend/src/jobs/scheduler.ts` existe | PARTIAL | Startup não verificado. |
| Shared-account UI subflows | screens-flows/frontend architecture | rotas + ficheiros existem | PARTIAL | Evidência estrutural existe; falta prova comportamental uniforme. |
| Stats auxiliary endpoints | API docs | módulo stats montado; cobertura explícita não visível | PARTIAL | `/compare-budget` e `/insights/latest` pouco provados. |

## 6. Orphans and Dead Signals

- `TODO.md` parece **stale** e já não é uma fonte fiável do estado real do produto.
- O `frontend/package.json` mantém o nome `@figma/my-make-file`, que é um sinal claro de **metadata residual de scaffold** e não de package identity alinhada com o projeto.
- O README de topo continua a anunciar `VITE_USE_MOCK`, o que hoje funciona como **sinal morto** no setup oficial do frontend.

## 7. High-Risk Gaps

Os gaps de maior risco não são os core flows de negócio, mas sim os que podem criar **falsa sensação de feature pronta**:

1. **Operacional/observability subverificados**: health, ready, metrics e scheduler aparecem como parte importante da arquitetura, mas não têm evidência automática equivalente nos testes publicados.
2. **Drift documental de setup**: `VITE_USE_MOCK` e inventário incompleto de temas podem induzir configuração errada, prompts errados e revisão errada.
3. **UI subflows menos centrais com menor prova**: shared create/join/accounts e subpáginas de perfil existem e têm cobertura estrutural, mas a prova comportamental publicada ainda é desigual.
4. **Endpoints auxiliares documentados sem cobertura visível**: budgets auxiliares e stats auxiliares podem estar funcionais, mas não estão “fechados” com a mesma robustez demonstrada nos flows principais.

## 8. Final Verdict

O que parece realmente concluído, pela evidência acessível, é o núcleo da app: **auth**, **multi-conta**, **budget + sync com incomes**, **bloqueio de manuais sem budget**, **income categories**, **recurring com fallback**, **stats base**, **página dedicada de insights**, **tutorial por página**, **theming/guardrails** e o **router principal**. Isso está bem sustentado por rotas reais, árvore de páginas/componentes e suites backend/frontend existentes.

O que parece parcial é sobretudo: **fecho operacional**, **alguns endpoints auxiliares**, **evidência comportamental de subfluxos menos centrais** e **consistência documental**. Aqui o repositório transmite, em vários pontos, mais maturidade do que a evidência publicada realmente demonstra.

O que claramente falta fazer, no mínimo, é: **limpar drift docs/backlog residual**, **reforçar verificação operacional (health/ready/metrics/scheduler)**, e **dar fecho verificável aos endpoints auxiliares que já estão documentados como parte do produto**.

Conclusão: o repositório **não parece “incompleto” no core funcional**, mas também **não o trataria como totalmente fechado**. Depois da reconciliação desta primeira fase, a leitura mais correta é a de **produto principal entregue + periferia ainda com gaps de prova, observabilidade e alinhamento documental**.

Nota de follow-up: o workspace já executou a implementação das correções e testes derivados deste audit, pelo que os gaps referidos acima devem ser tratados como histórico do audit original, não como estado atual do código.

## 9. Fontes consultadas

### Documentação carregada no workspace
- `README_AGENTS.md`
- `README.md`
- `system-overview.md`
- `domain-model.md`
- `data-model.md`
- `operations.md`
- `api-reference.md`
- `business-rules.md`
- `testing.md`
- `setup-config.md`
- `screens-flows.md`
- `quality-testing.md`
- `ui-v3-spec.md`
- `architecture.md`
- `design-tokens.md`
- `state-and-api.md`
- `runbooks.md`
- `deployment.md`
- `ci-cd.md`

### Repositório e ficheiros públicos consultados
- https://github.com/NunoMACastro/finance-app-fullstack
- https://github.com/NunoMACastro/finance-app-fullstack/blob/main/backend/src/routes/index.ts
- https://raw.githubusercontent.com/NunoMACastro/finance-app-fullstack/main/frontend/src/app/routes.ts
- https://github.com/NunoMACastro/finance-app-fullstack/blob/main/backend/package.json
- https://github.com/NunoMACastro/finance-app-fullstack/blob/main/frontend/package.json
- https://github.com/NunoMACastro/finance-app-fullstack/blob/main/TODO.md
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/backend/src
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/backend/src/jobs
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/backend/src/tests/integration
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/backend/src/tests/unit
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/frontend
- https://github.com/NunoMACastro/finance-app-fullstack/tree/main/frontend/src/app/components
