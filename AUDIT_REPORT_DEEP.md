# Deep Audit Report

## 1. Executive Summary

- Visão geral: a aplicação mostra boa intenção documental e vários blocos funcionais já organizados, mas ainda está abaixo do nível esperado para produção moderna em segurança, integridade de dados multi-conta, robustez operacional e supply chain.
- Findings totais: 37
- Distribuição por severidade:
    - Critical: 0
    - High: 12
    - Medium: 20
    - Low: 5
- Top riscos:
    - Segredos ativos de desenvolvimento/testes expostos no workspace do repositório.
    - Modelo de auth/session abaixo do baseline moderno: segredos fracos/default, refresh rotation sem reuse detection, sessões não invalidadas em mudança de password, tokens em `localStorage`.
    - Isolamento multi-conta frágil em pontos críticos: fallback silencioso de `X-Account-Id`, race no frontend ao trocar conta, e proteções de “último owner” vulneráveis a concorrência.
    - Integridade funcional incompleta entre budget/transações/categorias: `origin` de transação é controlado pelo cliente, categoria de despesa não é validada contra budget, remoção de categoria pode deixar lançamentos órfãos e invisíveis na UI.
    - Operação/CI abaixo do estado da arte: cron não é seguro para multi-instância, `/metrics` é público, readiness é superficial, CI não faz secret scanning nem gates modernos de supply chain.
- Avaliação global curta: aceitável como base de MVP evoluído; insuficiente para produção real multi-tenant/finance sem remediação prioritária.

## 2. Scope and Method

### O que foi lido

- SSOT documental lido pela ordem pedida:
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
- Ficheiro adicional lido por relevância: `docs/testing.md`

### Mapeamento docs -> código

- Não foi necessário remapear nomes/pastas: a estrutura real coincide com a estrutura pedida.
- Observação: existe documentação adicional de testes em `docs/testing.md`, referenciada por `docs/backend/testing.md`.

### O que foi auditado no código

- Backend:
    - bootstrap/config/middleware
    - auth, accounts, budgets, transactions, recurring, stats, jobs, models, scripts, testes
- Frontend:
    - app bootstrap, providers, contexts, stores, HTTP client, páginas principais, testes e contratos UI
- Operação:
    - `.github/workflows/ci.yml`
    - `package.json`/`package-lock.json` de backend e frontend

### O que foi executado

- Ambiente:
    - `node -v` -> `v24.11.1`
    - `npm -v` -> `11.6.2`
- Backend:
    - `npm run build` -> passou
    - `npm run test:unit` -> passou (`30 tests`)
    - `npm run test:integration` -> falhou por limitação do sandbox (`listen EPERM 0.0.0.0`)
    - `npm audit --package-lock-only` -> `0 vulnerabilities`
    - `npm audit signatures --package-lock-only` -> falhou por permissões na cache npm
- Frontend:
    - `npm run typecheck` -> falhou (`tsc: command not found`)
    - `npm run lint` -> falhou (`eslint: command not found`)
    - `npm run test` -> falhou (`vitest: command not found`)
    - `npm run build` -> falhou (`vite: command not found`)
    - `npm audit --package-lock-only` -> encontrou 2 vulnerabilidades (`flatted`, `vite`)

### Limitações do ambiente

- `npm ci` falhou em backend e frontend com `EACCES` ao tentar remover/escrever `node_modules`.
- O frontend local estava com `node_modules/.bin` ausente, pelo que os scripts não puderam ser executados.
- Os testes de integração backend falharam por restrições do sandbox em sockets/listeners do `MongoMemoryServer`.
- Não houve acesso de rede útil para validações externas adicionais além dos comandos locais.

### Baseline usada para “estado da arte”

- OWASP ASVS 5.0
- OWASP API Security Top 10 2023
- RFC 8725 (JWT BCP)
- Security best practices oficiais de Express/Node.js/MongoDB/npm
- Boas práticas modernas de CI/supply chain para npm

## 3. Findings Summary Table

| ID    | Severity | Confidence | Area               | Category             | Title                                                                        | Evidence                                                                                                                                                                                                                                        | Short impact                                                             |
| ----- | -------- | ---------- | ------------------ | -------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F-001 | Medium   | High       | Security           | Security             | Segredos ativos de desenvolvimento expostos em `backend/.env`                | `backend/.env:3-12`                                                                                                                                                                                                                             | Compromisso do ambiente local/dev e custo indevido limitado              |
| F-002 | High     | High       | Auth               | Security             | Segredos JWT fracos/default aceites pelo runtime                             | `backend/.env:4-5`, `backend/src/config/env.ts:48-55`                                                                                                                                                                                           | Assinatura de tokens fica trivial em ambientes mal configurados          |
| F-003 | Medium   | High       | Auth               | State-of-the-Art Gap | JWT sem pinning explícito de algoritmo/issuer/audience                       | `backend/src/lib/jwt.ts:15-35`                                                                                                                                                                                                                  | Validação abaixo do BCP moderno                                          |
| F-004 | Medium   | High       | Auth               | Validation           | Política de password demasiado fraca                                         | `backend/src/modules/auth/validators.ts:8-12`, `backend/src/modules/auth/validators.ts:54-57`                                                                                                                                                   | Facilita credenciais fracas                                              |
| F-005 | High     | High       | Auth               | Auth                 | Alteração de password não revoga sessões                                     | `backend/src/modules/auth/service.ts:498-510`                                                                                                                                                                                                   | Sessões roubadas permanecem válidas                                      |
| F-006 | High     | High       | Auth               | Auth                 | Refresh rotation sem reuse detection real                                    | `backend/src/modules/auth/service.ts:303-355`                                                                                                                                                                                                   | Reutilização de refresh comprometido não corta a cadeia                  |
| F-007 | Medium   | High       | Auth               | Auth                 | Logout/revogação não invalida access tokens já emitidos                      | `backend/src/modules/auth/service.ts:526-566`, `backend/src/lib/jwt.ts:15-35`                                                                                                                                                                   | Janela residual de acesso após revogação                                 |
| F-008 | High     | High       | API                | API Contract         | Cliente pode criar transações com `origin=recurring`                         | `backend/src/modules/transactions/validators.ts:9-18`, `backend/src/modules/transactions/service.ts:152-159`                                                                                                                                    | Bypass de regra de budget/manual e poluição de modelo                    |
| F-009 | High     | High       | Backend            | Data Integrity       | Categoria de despesa não é validada contra o budget                          | `backend/src/modules/transactions/service.ts:95-114`, `backend/src/modules/transactions/service.ts:160`, `backend/src/modules/transactions/service.ts:218`                                                                                      | Despesas podem referenciar categorias inválidas                          |
| F-010 | Medium   | High       | Backend            | Data Integrity       | Sync de incomes -> `totalBudget` não é atómico                               | `backend/src/modules/transactions/service.ts:162-179`, `backend/src/modules/transactions/service.ts:242-267`, `backend/src/modules/budgets/service.ts:266-279`                                                                                  | Divergências transitórias/permanentes sob falha                          |
| F-011 | Medium   | High       | Backend            | Maintainability      | `GET /budgets/:month` tem side effects de escrita                            | `backend/src/modules/budgets/service.ts:305-335`                                                                                                                                                                                                | Leituras mudam estado e mascaram drift                                   |
| F-012 | High     | High       | Backend            | Data Integrity       | Remover categoria não verifica transações existentes                         | `backend/src/modules/budgets/service.ts:429-463`                                                                                                                                                                                                | Lançamentos órfãos ficam sem categoria válida                            |
| F-013 | High     | High       | FE <-> BE <-> BD   | Frontend             | UI mensal esconde despesas órfãs                                             | `frontend/src/app/components/month-page.tsx:434-474`, `frontend/src/app/components/month-page.tsx:721-739`                                                                                                                                      | Utilizador perde visibilidade de gastos reais                            |
| F-014 | Medium   | High       | Frontend           | Frontend             | UI permite lançar manualmente na categoria técnica de fallback               | `frontend/src/app/components/month-page.tsx:1086-1112`, `docs/backend/business-rules.md:107-117`                                                                                                                                                | Categoria interna do sistema entra no fluxo manual                       |
| F-015 | High     | High       | Multi-account      | Authorization        | Backend faz fallback silencioso para conta pessoal sem `X-Account-Id`        | `backend/src/middleware/account-context.ts:24-33`                                                                                                                                                                                               | Falhas de header mudam silenciosamente o tenant alvo                     |
| F-016 | High     | High       | Frontend           | Frontend             | Race no `MonthPage` pode misturar dados entre contas                         | `frontend/src/app/components/month-page.tsx:301-321`, `frontend/src/app/components/stats-page.tsx:116-126`                                                                                                                                      | Resposta antiga pode sobrescrever estado da conta ativa                  |
| F-017 | High     | High       | Frontend           | Security             | Access e refresh tokens guardados em `localStorage`                          | `frontend/src/app/lib/token-store.ts:4-37`, `docs/frontend/state-and-api.md:172-176`                                                                                                                                                            | XSS passa a ser compromissão total de sessão                             |
| F-018 | Medium   | High       | Frontend           | Concurrency          | Interceptor repete pedidos não idempotentes após refresh                     | `frontend/src/app/lib/http-client.ts:54-105`                                                                                                                                                                                                    | POST/PUT/DELETE podem ser reexecutados indevidamente                     |
| F-019 | Medium   | Medium     | Frontend           | Concurrency          | Refresh queue é por tab apenas; há race multi-tab                            | `frontend/src/app/lib/http-client.ts:39-105`, `frontend/src/app/lib/token-store.ts:11-37`                                                                                                                                                       | Tabs podem invalidar sessões umas das outras                             |
| F-020 | High     | High       | Docs/Operations    | Docs Drift           | Setup/documentação subestima requisito real de replica set                   | `backend/.env.example:3-5`, `docs/backend/setup-config.md:5-16`, `docs/backend/operations.md:132-137`, `backend/src/modules/auth/service.ts:192-249`                                                                                            | Instalações “válidas” pela doc podem falhar em runtime                   |
| F-021 | Medium   | High       | Backend            | Security             | `trust proxy` fixo em `1`                                                    | `backend/src/app.ts:26-28`                                                                                                                                                                                                                      | Forwarded headers podem ser mal confiados                                |
| F-022 | Medium   | High       | Security           | State-of-the-Art Gap | Rate limiting é in-memory e pouco adaptado às superfícies críticas           | `backend/src/app.ts:71-82`, `backend/src/routes/index.ts:14-25`                                                                                                                                                                                 | Não escala entre instâncias e pode criar lockouts/refresh noise          |
| F-023 | Medium   | Medium     | Operations         | Backend              | Scheduler não é seguro para multi-instância e falha em cascata               | `backend/src/jobs/scheduler.ts:14-37`                                                                                                                                                                                                           | Duplicação de jobs ou abortar snapshots restantes                        |
| F-024 | Medium   | High       | Operations         | Security             | `/metrics` é público e usa labels com cardinalidade não controlada           | `backend/src/app.ts:97-100`, `backend/src/middleware/metrics.ts:22-35`                                                                                                                                                                          | Exposição operacional e custo em Prometheus                              |
| F-025 | Low      | High       | Database           | Database             | Refresh tokens e invite codes sem TTL cleanup                                | `backend/src/models/refresh-token.model.ts:19-23`, `backend/src/models/account-invite-code.model.ts:16-24`                                                                                                                                      | Bloat operacional desnecessário                                          |
| F-026 | Low      | High       | Backend            | Maintainability      | Snapshots de stats são materializados mas não consumidos                     | `backend/src/modules/stats/service.ts:360-405`, `backend/src/modules/stats/service.ts:441-480`                                                                                                                                                  | Trabalho em background sem valor funcional atual                         |
| F-027 | Medium   | High       | API                | API Contract         | `compare-budget` aceita ranges inválidos e corta silenciosamente >36 meses   | `backend/src/modules/stats/validators.ts:32-35`, `backend/src/modules/stats/service.ts:408-423`                                                                                                                                                 | API devolve resultados incompletos sem sinalizar erro                    |
| F-028 | Medium   | High       | FE <-> BE <-> BD   | Validation           | `currency` aceita qualquer código de 3 chars e pode partir renderização      | `backend/src/modules/auth/validators.ts:27-37`, `frontend/src/app/lib/formatting.ts:9-21`                                                                                                                                                       | Perfil inválido pode quebrar UI                                          |
| F-029 | Medium   | High       | Frontend           | Docs Drift           | Derivação de `monthKey` no FE é inconsistente com contrato UTC               | `frontend/src/app/components/month-page.tsx:258-293`, `frontend/src/app/components/recurring-rules-page.tsx:25-28`, `frontend/src/app/components/budget-editor-page.tsx:60-64`, `frontend/src/app/components/category-movements-page.tsx:86-91` | Bugs em fronteiras de mês/timezone                                       |
| F-030 | Low      | High       | Frontend/API       | Performance          | UI filtra localmente após buscar o mês inteiro                               | `backend/src/modules/transactions/service.ts:116-133`, `frontend/src/app/components/category-movements-page.tsx:131-179`                                                                                                                        | Escala mal com volume de lançamentos                                     |
| F-031 | Low      | High       | Frontend           | Docs Drift           | Frontend ignora `expiresAt` do convite                                       | `backend/src/modules/accounts/service.ts:349-351`, `frontend/src/app/components/profile-shared-members-page.tsx:96-101`                                                                                                                         | UX/documentação divergentes e código expirado pode parecer válido        |
| F-032 | High     | Medium     | Multi-account      | Concurrency          | Proteção “último owner” é vulnerável a corridas concorrentes                 | `backend/src/modules/accounts/service.ts:473-485`, `backend/src/modules/accounts/service.ts:525-538`, `backend/src/modules/accounts/service.ts:560-577`, `backend/src/modules/auth/service.ts:649-661`                                          | Conta partilhada pode ficar sem owner ativo                              |
| F-033 | Medium   | Medium     | Backend            | Concurrency          | Geração de convite pode deixar múltiplos códigos ativos em concorrência      | `backend/src/modules/accounts/service.ts:326-347`, `backend/src/models/account-invite-code.model.ts:38`                                                                                                                                         | Invariante “um código ativo” não é garantido                             |
| F-034 | Low      | High       | Operations         | Backend              | Readiness check só olha para `mongoose.readyState`                           | `backend/src/app.ts:88-95`, `backend/src/config/db.ts:18-20`                                                                                                                                                                                    | Pode sinalizar pronto enquanto operações críticas falham                 |
| F-035 | Medium   | High       | Privacy/Operations | State-of-the-Art Gap | Insight IA envia dados financeiros agregados por defeito                     | `backend/src/modules/stats/service.ts:363-405`, `backend/src/modules/stats/insight.service.ts:201-280`, `frontend/src/app/components/stats-page.tsx:120-126`                                                                                    | Transferência para terceiro sem opt-in explícito                         |
| F-036 | Medium   | High       | CI/CD              | CI/CD                | CI não tem gates modernos de security/supply-chain/secret scanning           | `.github/workflows/ci.yml:8-74`, `backend/.env:3-12`                                                                                                                                                                                            | Exposição de segredos e dependências frágeis passam sem travas dedicadas |
| F-037 | Medium   | High       | Testing            | Testing              | Faltam testes automatizados para riscos críticos de auth/session/concurrency | `docs/backend/testing.md:84-102`, `find backend/src/tests -maxdepth 2 -type f`, `find frontend/src -name '*test.ts*'`                                                                                                                           | Regressões de segurança e multi-conta podem passar despercebidas         |

## 4. Findings (DETALHADO E COMPLETO)

### [F-001] [Medium] [Security] Segredos ativos de desenvolvimento expostos em `backend/.env`

- Status: Confirmed
- Category: Security
- Impact: compromisso do ambiente de desenvolvimento/testes, incluindo acesso à base de dados de dev e potencial consumo indevido da API da OpenAI associada ao ambiente local.
- Why this matters: embora os segredos expostos não sejam de produção e a base de dados referida não contenha dados reais, continuam a ser credenciais ativas guardadas dentro da árvore do projeto. Isso mantém risco de exfiltração local, uso indevido de recursos e normalização de um padrão operacional frágil.
- Evidence:
    - `backend/.env:3`
    - `backend/.env:12`
    - `backend/.env:4-5`
    - command output: `git ls-files backend/.env frontend/.env backend/.env.example` devolveu apenas `backend/.env.example`, confirmando que o ficheiro exposto está no workspace mas não trackado
- Expected / state-of-the-art behavior:
    - Segredos ativos, mesmo de desenvolvimento, não devem ficar guardados em ficheiros locais dentro da árvore do repositório.
    - Ambientes locais devem receber segredos via configuração externa ao repo, IDE, shell env, ou secret manager apropriado ao contexto.
- Current behavior:
    - `backend/.env` contém uma URI MongoDB ativa para uma base de dados de testes/dev e uma `OPENAI_API_KEY` usada localmente.
- Risk scenario:
    - Um commit acidental, partilha da pasta, backup inseguro, extensão maliciosa ou exfiltração local expõe o ambiente de dev/testes e permite uso indevido desses recursos.
- Context that reduces severity:
    - A URI Mongo apontada é apenas de testes/dev.
    - A base de dados não contém dados reais.
    - Produção usa outra base de dados e outras credenciais.
    - A configuração OpenAI de produção é separada.
- Recommendation direction (sem implementar):
    - Remover segredos ativos do `backend/.env` dentro do repo e carregá-los a partir de configuração local externa.
    - Manter `.env.example` apenas com placeholders.
    - Adicionar secret scanning preventivo em CI e pre-commit.
- Confidence:
    - High

### [F-002] [High] [Auth] Segredos JWT fracos/default aceites pelo runtime

- Status: Confirmed
- Category: Security
- Impact: em ambientes mal configurados, tokens podem ser assinados com segredos previsíveis.
- Why this matters: segredos default em auth são um anti-pattern grave; em ambientes clonados, staging ou dev exposto, isto torna a confiança nos JWTs muito fraca.
- Evidence:
    - `backend/.env:4-5`
    - `backend/src/config/env.ts:48-55`
- Expected / state-of-the-art behavior:
    - Nenhum ambiente deve arrancar com segredos default ou placeholders triviais para JWT.
- Current behavior:
    - O runtime aceita `dev-access-secret` / `dev-refresh-secret` por fallback e o `.env` usa `change-me-*`.
- Risk scenario:
    - Um deploy ou ambiente partilhado arranca com defaults; um atacante assina os próprios tokens.
- Recommendation direction (sem implementar):
    - Tornar os segredos obrigatórios em todos os ambientes relevantes.
    - Rejeitar placeholders conhecidos em bootstrap.
- Confidence:
    - High

### [F-003] [Medium] [Auth] JWT sem pinning explícito de algoritmo, issuer e audience

- Status: Confirmed
- Category: State-of-the-Art Gap
- Impact: validação abaixo do baseline moderno de JWT; reduz defense-in-depth.
- Why this matters: RFC 8725 recomenda restringir algoritmos e validar claims contextuais mínimas. Usar `jwt.verify` sem `algorithms`, `issuer`, `audience` e afins deixa demasiado comportamento implícito na library/configuração.
- Evidence:
    - `backend/src/lib/jwt.ts:15-35`
- Expected / state-of-the-art behavior:
    - Algoritmo explicitamente fixado.
    - Claims mínimas e estáveis (`iss`, `aud`) validadas.
- Current behavior:
    - Tokens são assinados/verificados apenas com secret e expiração.
- Risk scenario:
    - Mudança futura de config/lib ou integração heterogénea introduz aceitação indevida de tokens fora do contexto esperado.
- Recommendation direction (sem implementar):
    - Fixar algoritmo e validar `issuer`/`audience`.
    - Rever claims para ficarem mínimas e específicas por token type.
- Confidence:
    - High

### [F-004] [Medium] [Auth] Política de password demasiado fraca

- Status: Confirmed
- Category: Validation
- Impact: aumenta risco de credenciais fracas e brute-force bem sucedido.
- Why this matters: `min(6)` está abaixo do baseline moderno para 2026, especialmente numa app financeira.
- Evidence:
    - `backend/src/modules/auth/validators.ts:8-12`
    - `backend/src/modules/auth/validators.ts:54-57`
- Expected / state-of-the-art behavior:
    - Política orientada para passwords longas e resistentes, com mínimo mais robusto e controlos complementares.
- Current behavior:
    - Registo e alteração de password aceitam 6 caracteres.
- Risk scenario:
    - Passwords triviais passam a validação e acabam comprometidas por stuffing/guessing.
- Recommendation direction (sem implementar):
    - Aumentar o mínimo e complementar com controlos de brute-force e listas de passwords comprometidas.
- Confidence:
    - High

### [F-005] [High] [Auth] Alteração de password não revoga refresh tokens/sessões

- Status: Confirmed
- Category: Auth
- Impact: um atacante com sessão já roubada continua autenticado após a vítima mudar a password.
- Why this matters: mudança de password é um evento de segurança; deve cortar sessões existentes por default ou pelo menos as restantes.
- Evidence:
    - `backend/src/modules/auth/service.ts:498-510`
- Expected / state-of-the-art behavior:
    - Alterar password deve revogar refresh tokens ativos e, idealmente, forçar relogin de outras sessões.
- Current behavior:
    - Apenas `passwordHash` é atualizado.
- Risk scenario:
    - Conta comprometida mantém sessões paralelas ativas mesmo depois de mitigação pelo utilizador.
- Recommendation direction (sem implementar):
    - Revogar todas as sessões no change-password e refletir isso na UX.
- Confidence:
    - High

### [F-006] [High] [Auth] Refresh rotation sem reuse detection real

- Status: Confirmed
- Category: Auth
- Impact: um refresh token roubado reutilizado não provoca revogação da cadeia de descendentes.
- Why this matters: rotação sem reuse detection é uma mitigação incompleta. O código só invalida o token atual e cria o próximo; se o token antigo aparecer de novo, responde 401, mas não trata o evento como compromisso.
- Evidence:
    - `backend/src/modules/auth/service.ts:322-350`
    - `backend/src/models/refresh-token.model.ts:24-30`
- Expected / state-of-the-art behavior:
    - Reuso de refresh previamente rotacionado deve ser tratado como incidente e revogar descendentes/sessões relevantes.
- Current behavior:
    - Tokens revogados ou expirados devolvem `REFRESH_TOKEN_REVOKED`, sem chain revocation.
- Risk scenario:
    - Atacante e utilizador correm em paralelo; quando o reuso é detetado, a sessão mais recente pode continuar viva.
- Recommendation direction (sem implementar):
    - Implementar família de tokens com reuse detection e revogação em cascata.
- Confidence:
    - High

### [F-007] [Medium] [Auth] Logout e revogação de sessões não invalidam access tokens já emitidos

- Status: Confirmed
- Category: Auth
- Impact: acesso residual até expirar o access token.
- Why this matters: o modelo atual revoga apenas refresh tokens persistidos. Access tokens permanecem puramente stateless até `exp`.
- Evidence:
    - `backend/src/modules/auth/service.ts:526-566`
    - `backend/src/lib/jwt.ts:15-35`
- Expected / state-of-the-art behavior:
    - Eventos de revogação sensíveis devem reduzir ao mínimo a janela de validade residual.
- Current behavior:
    - `revokeSession`, `revokeAllSessions` e `logout` não interagem com access tokens já emitidos.
- Risk scenario:
    - Dispositivo comprometido continua a operar durante a janela do access token após revogação.
- Recommendation direction (sem implementar):
    - Reduzir TTL efetivo ou introduzir mecanismo de invalidation/versioning para eventos sensíveis.
- Confidence:
    - High

### [F-008] [High] [API] Cliente pode criar transações com `origin=recurring`

- Status: Confirmed
- Category: API Contract
- Impact: quebra da separação entre lançamentos manuais e lançamentos gerados pelo sistema.
- Why this matters: a regra documental diz que transações recorrentes internas não passam pelo bloqueio de budget manual. Ao aceitar `origin=recurring` do cliente, a API entrega esse poder ao frontend/chamador.
- Evidence:
    - `backend/src/modules/transactions/validators.ts:9-18`
    - `backend/src/modules/transactions/service.ts:152-159`
    - `docs/backend/business-rules.md:64-70`
- Expected / state-of-the-art behavior:
    - `origin` de sistema não deve ser overpostable por clientes externos.
- Current behavior:
    - O endpoint de criação aceita `origin=recurring` e `recurringRuleId`.
- Risk scenario:
    - Cliente malicioso cria despesas “recorrentes” manuais, contorna gating e polui idempotência/rastreabilidade.
- Recommendation direction (sem implementar):
    - Tornar `origin` server-controlled em endpoints públicos.
    - Reservar `recurring` para service interna.
- Confidence:
    - High

### [F-009] [High] [Backend] Categoria de despesa não é validada contra o budget do mês

- Status: Confirmed
- Category: Data Integrity
- Impact: despesas podem apontar para categorias que não existem no budget ativo do mês.
- Why this matters: o orçamento é a taxonomia de despesa usada em toda a UX, relatórios e invariantes. Só verificar “não vazio” é insuficiente.
- Evidence:
    - `backend/src/modules/transactions/service.ts:95-114`
    - `backend/src/modules/transactions/service.ts:160`
    - `backend/src/modules/transactions/service.ts:218`
- Expected / state-of-the-art behavior:
    - Despesa manual deve validar que `categoryId` existe na conta e no budget/mês aplicável.
- Current behavior:
    - Para `expense`, o backend apenas exige `categoryId` não vazio.
- Risk scenario:
    - Dados incoerentes entram na base; páginas dependentes deixam de apresentar corretamente as despesas.
- Recommendation direction (sem implementar):
    - Validar categoria de despesa contra budget ativo do mês antes de persistir.
- Confidence:
    - High

### [F-010] [Medium] [Backend] Sync de `totalBudget` após income não é atómico

- Status: Confirmed
- Category: Data Integrity
- Impact: `Transaction` e `Budget.totalBudget` podem divergir após falhas parciais.
- Why this matters: `totalBudget` é documentado como derivado e backend source of truth, mas a implementação faz duas escritas separadas.
- Evidence:
    - `backend/src/modules/transactions/service.ts:162-179`
    - `backend/src/modules/transactions/service.ts:242-267`
    - `backend/src/modules/budgets/service.ts:266-279`
    - `docs/backend/business-rules.md:71-79`
- Expected / state-of-the-art behavior:
    - Atualização da transação de income e do total derivado devem ser consistentes/atómicas.
- Current behavior:
    - Cria/atualiza/apaga transação e só depois corre `syncBudgetTotalFromTransactions`.
- Risk scenario:
    - Crash, timeout ou erro intermédio deixa `totalBudget` stale.
- Recommendation direction (sem implementar):
    - Agrupar atualização derivada em operação transacional ou calcular on-read sem persistência redundante.
- Confidence:
    - High

### [F-011] [Medium] [Backend] `GET /budgets/:month` altera estado

- Status: Confirmed
- Category: Maintainability
- Impact: leituras podem escrever em BD, mascarar problemas e introduzir efeitos laterais inesperados.
- Why this matters: endpoints GET com mutação escondida prejudicam cacheabilidade, observabilidade, troubleshooting e testes.
- Evidence:
    - `backend/src/modules/budgets/service.ts:305-335`
- Expected / state-of-the-art behavior:
    - GET deve ser side-effect free ou, no limite, ter side-effects explicitamente controlados e operacionalizados.
- Current behavior:
    - `getBudget` pode recalcular `totalBudget`, normalizar categorias e fazer `budget.save()`.
- Risk scenario:
    - Uma simples leitura corrige/reescreve dados e torna difícil distinguir reparação automática de alteração intencional.
- Recommendation direction (sem implementar):
    - Separar reparação de leitura e remover persistência implícita do fluxo GET.
- Confidence:
    - High

### [F-012] [High] [Backend] Remover categoria não verifica referências existentes

- Status: Confirmed
- Category: Data Integrity
- Impact: transações históricas ficam a apontar para categorias removidas.
- Why this matters: a app simula integridade relacional em MongoDB; remover chaves referenciadas sem reatribuição ou bloqueio cria órfãos funcionais.
- Evidence:
    - `backend/src/modules/budgets/service.ts:429-463`
    - `backend/src/modules/transactions/service.ts:36-69`
- Expected / state-of-the-art behavior:
    - Bloquear remoção com referências vivas, ou migrar/reatribuir consistentemente.
- Current behavior:
    - A categoria sai do budget sem qualquer verificação sobre `Transaction.categoryId`.
- Risk scenario:
    - Histórico financeiro deixa de estar alinhado com a taxonomia apresentada e com os relatórios.
- Recommendation direction (sem implementar):
    - Impedir remoção de categorias em uso ou oferecer migração explícita e auditável.
- Confidence:
    - High

### [F-013] [High] [FE <-> BE <-> BD] UI mensal esconde despesas órfãs

- Status: Confirmed
- Category: Frontend
- Impact: o utilizador pode deixar de ver gastos reais na principal vista mensal, criando perceção falsa do estado financeiro.
- Why this matters: depois do finding anterior, o frontend só renderiza grupos de despesa a partir de `budget.categories`. Despesas órfãs deixam de ter um row/entry visível na navegação principal.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:434-474`
    - `frontend/src/app/components/month-page.tsx:721-739`
    - `backend/src/modules/budgets/service.ts:429-463`
- Expected / state-of-the-art behavior:
    - O frontend deve continuar a mostrar todas as despesas persistidas, mesmo quando a categoria configuracional driftou.
- Current behavior:
    - A UI deriva linhas de despesa apenas do budget atual.
- Risk scenario:
    - Gasto histórico continua na BD, afeta totais, mas “desaparece” da exploração normal por categoria.
- Recommendation direction (sem implementar):
    - Introduzir representação explícita para órfãos/fallbacks e alinhar modelo de exibição com a verdade da BD.
- Confidence:
    - High

### [F-014] [Medium] [Frontend] UI permite lançar manualmente na categoria técnica de fallback

- Status: Confirmed
- Category: Frontend
- Impact: categoria interna do sistema entra no fluxo manual e perde semântica operacional.
- Why this matters: a categoria `fallback_recurring_expense` existe para reter recorrências com drift; não deveria aparecer como escolha de lançamento manual.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:1086-1112`
    - `docs/backend/business-rules.md:107-117`
- Expected / state-of-the-art behavior:
    - Categorias técnicas protegidas devem ficar fora do seletor de input manual.
- Current behavior:
    - O `select` usa `expenseCategories.map(...)` sem filtrar a categoria protegida.
- Risk scenario:
    - O utilizador passa a classificar manualmente despesas numa categoria pensada só para exceções do sistema.
- Recommendation direction (sem implementar):
    - Filtrar categorias técnicas/protegidas do seletor manual.
- Confidence:
    - High

### [F-015] [High] [Multi-account] Backend faz fallback silencioso para conta pessoal sem `X-Account-Id`

- Status: Confirmed
- Category: Authorization
- Impact: pedidos autenticados mal formados ou parcialmente contextuais podem operar na conta errada sem erro explícito.
- Why this matters: o domínio é explicitamente account-scoped. Em multi-conta, falhar fechado é mais seguro do que escolher um tenant implícito.
- Evidence:
    - `backend/src/middleware/account-context.ts:24-33`
    - `docs/backend/business-rules.md:7-10`
- Expected / state-of-the-art behavior:
    - Endpoints account-scoped relevantes devem falhar quando o contexto esperado não é enviado/consistente.
- Current behavior:
    - O middleware usa `personalAccountId` quando o header falta.
- Risk scenario:
    - Um bug de frontend ou proxy retira o header e o utilizador passa a ler/escrever a conta pessoal em vez da partilhada.
- Recommendation direction (sem implementar):
    - Diferenciar endpoints onde o header é obrigatório e fazer fail-closed nesses casos.
- Confidence:
    - High

### [F-016] [High] [Frontend] `MonthPage` vulnerável a stale responses na troca de conta

- Status: Confirmed
- Category: Frontend
- Impact: estado da UI pode mostrar dados de uma conta enquanto a conta ativa já é outra.
- Why this matters: a própria documentação fala em robustez de concorrência. `StatsPage` implementa um guard `requestIdRef`; `MonthPage` não.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:301-321`
    - `frontend/src/app/components/stats-page.tsx:116-126`
    - `docs/frontend/state-and-api.md:184-190`
- Expected / state-of-the-art behavior:
    - Requests antigos devem ser cancelados ou ignorados ao trocar conta/período.
- Current behavior:
    - `MonthPage` faz `Promise.all` e aplica o resultado diretamente sem request identity guard.
- Risk scenario:
    - Resposta lenta da conta A chega depois da troca para conta B e substitui `summary`, `budget` e `incomeCategories`.
- Recommendation direction (sem implementar):
    - Aplicar request guards/cancelation consistentes entre páginas account-scoped.
- Confidence:
    - High

### [F-017] [High] [Frontend] Tokens persistidos em `localStorage`

- Status: Confirmed
- Category: Security
- Impact: qualquer XSS passa a equivaler a roubo total de sessão, incluindo refresh token.
- Why this matters: guardar refresh token em `localStorage` é abaixo do baseline atual para aplicações com dados financeiros.
- Evidence:
    - `frontend/src/app/lib/token-store.ts:4-37`
    - `docs/frontend/state-and-api.md:172-176`
- Expected / state-of-the-art behavior:
    - Preferir mecanismos menos expostos a XSS para refresh/session continuity.
- Current behavior:
    - Access token e refresh token são lidos/escritos diretamente em `localStorage`.
- Risk scenario:
    - Uma única superfície XSS no frontend exfiltra sessão longa.
- Recommendation direction (sem implementar):
    - Reavaliar storage de tokens com prioridade no refresh token e na modelação de sessão.
- Confidence:
    - High

### [F-018] [Medium] [Frontend] Interceptor repete pedidos não idempotentes após refresh

- Status: Confirmed
- Category: Concurrency
- Impact: requests mutáveis podem ser executados duas vezes.
- Why this matters: o interceptor reenvia o request original após refresh, independentemente do método. Em falhas limítrofes de auth/expiração, POST/PUT/DELETE podem voltar a correr.
- Evidence:
    - `frontend/src/app/lib/http-client.ts:54-105`
- Expected / state-of-the-art behavior:
    - Reexecução automática deve ser limitada a operações seguras/idempotentes ou protegida por idempotency keys.
- Current behavior:
    - Qualquer request 401 não marcado como `_retry` é reenviado.
- Risk scenario:
    - Ação destrutiva ou criação manual repete-se quando o access token expira durante a operação.
- Recommendation direction (sem implementar):
    - Restringir retries automáticos e rever endpoints mutáveis com idempotência explícita.
- Confidence:
    - High

### [F-019] [Medium] [Frontend] Refresh queue é apenas intra-tab

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: múltiplos tabs podem competir pelo mesmo refresh token rotativo.
- Why this matters: a queue global em memória (`isRefreshing`, `pendingQueue`) existe só por contexto JS atual. Com refresh rotation no backend, tabs independentes podem invalidar-se mutuamente.
- Evidence:
    - `frontend/src/app/lib/http-client.ts:39-105`
    - `frontend/src/app/lib/token-store.ts:11-37`
- Expected / state-of-the-art behavior:
    - Gestão de refresh em multi-tab deve coordenar-se entre tabs ou aceitar explicitamente o tradeoff.
- Current behavior:
    - Não há coordenação cross-tab; tokens ficam em `localStorage`.
- Risk scenario:
    - Tab A roda o refresh, Tab B usa token antigo e falha, disparando logout global.
- Recommendation direction (sem implementar):
    - Coordenar refresh cross-tab ou redesenhar o modelo de sessão.
- Confidence:
    - Medium

### [F-020] [High] [Docs/Operations] Setup/documentação subestima requisito real de replica set

- Status: Confirmed
- Category: Docs Drift
- Impact: ambientes montados “segundo a documentação” podem falhar em operações críticas que usam transações Mongo.
- Why this matters: a documentação apresenta `MongoDB local ou Atlas` e um URI default standalone, enquanto o código usa `withTransaction` em registo, contas e delete-self.
- Evidence:
    - `backend/.env.example:3-5`
    - `docs/backend/setup-config.md:5-16`
    - `docs/backend/operations.md:132-137`
    - `backend/src/modules/auth/service.ts:192-249`
    - `backend/src/modules/accounts/service.ts:54-65`
- Expected / state-of-the-art behavior:
    - O requisito de replica set/transações deve ser explícito e tratado como obrigatório para features dependentes.
- Current behavior:
    - A doc só diz “recomendado para transações”.
- Risk scenario:
    - Equipa arranca num Mongo standalone local, valida flows simples, e depois encontra falhas severas em registo/ownership/delete em runtime.
- Recommendation direction (sem implementar):
    - Atualizar documentação e validação de startup para refletir dependência real de transações.
- Confidence:
    - High

### [F-021] [Medium] [Backend] `trust proxy` fixo em `1`

- Status: Confirmed
- Category: Security
- Impact: confiança errada em headers forwarded pode distorcer rate limiting, IP logging e política de segurança.
- Why this matters: `trust proxy` é topology-sensitive. Hardcode `1` assume um reverse proxy único e estável.
- Evidence:
    - `backend/src/app.ts:26-28`
- Expected / state-of-the-art behavior:
    - `trust proxy` deve ser configurado por ambiente/topologia, não hardcoded.
- Current behavior:
    - A app confia sempre no primeiro proxy.
- Risk scenario:
    - Em topologia diferente, um cliente consegue influenciar IP percebido via forwarding headers.
- Recommendation direction (sem implementar):
    - Parametrizar `trust proxy` por ambiente e documentar topologias suportadas.
- Confidence:
    - High

### [F-022] [Medium] [Security] Rate limiting in-memory e pouco adaptado às superfícies críticas

- Status: Confirmed
- Category: State-of-the-Art Gap
- Impact: limitação não escala horizontalmente e pode interagir mal com refresh/auth flows.
- Why this matters: `express-rate-limit` default usa memória local do processo. Isso perde eficácia em multi-instância e trata `/auth` de forma demasiado uniforme.
- Evidence:
    - `backend/src/app.ts:71-82`
    - `backend/src/routes/index.ts:14-25`
- Expected / state-of-the-art behavior:
    - Stores distribuídos para produção e políticas diferenciadas por superfície sensível.
- Current behavior:
    - Limiter global e limiter auth sem backend distribuído; refresh cai no mesmo grupo.
- Risk scenario:
    - Um burst num nó não protege os restantes; ao mesmo tempo, clientes em refresh podem atingir rate limits colaterais.
- Recommendation direction (sem implementar):
    - Introduzir store partilhado e políticas específicas para login, refresh, join code e restantes superfícies.
- Confidence:
    - High

### [F-023] [Medium] [Operations] Scheduler não é seguro para multi-instância e falha em cascata

- Status: Likely / Needs confirmation
- Category: Backend
- Impact: jobs duplicados em deploys horizontais e interrupção do loop de snapshots por uma conta problemática.
- Why this matters: o cron é arrancado por cada processo. Não existe lock distribuído/leader election, nem `try/catch` por conta no loop.
- Evidence:
    - `backend/src/jobs/scheduler.ts:14-37`
- Expected / state-of-the-art behavior:
    - Apenas um executor efetivo por job ou mecanismo robusto de dedupe.
    - Falhas por conta não devem abortar o restante batch.
- Current behavior:
    - Cada instância agenda o job e o loop `for` aguarda cada conta sem isolamento de erros.
- Risk scenario:
    - N instâncias geram o mesmo job ao mesmo tempo; uma conta com erro em `materializeCurrentSnapshots` impede as seguintes.
- Recommendation direction (sem implementar):
    - Introduzir coordenação distribuída e isolamento de falhas por unidade de trabalho.
- Confidence:
    - Medium

### [F-024] [Medium] [Operations] `/metrics` público e com cardinalidade de labels não controlada

- Status: Confirmed
- Category: Security
- Impact: exposição de informação operacional e risco de blow-up em métricas.
- Why this matters: `req.path` para rotas não resolvidas cria labels potencialmente muito numerosas. Além disso, `/metrics` está aberto sem auth ou allowlist.
- Evidence:
    - `backend/src/app.ts:97-100`
    - `backend/src/middleware/metrics.ts:22-35`
- Expected / state-of-the-art behavior:
    - Endpoint de métricas protegido por rede/autorização.
    - Labels limitadas a templates estáveis.
- Current behavior:
    - Qualquer cliente consegue consultar métricas; paths não mapeados usam `req.path`.
- Risk scenario:
    - Bot faz spam de paths distintos, aumentando cardinalidade e custo; atacante recolhe insight operacional interno.
- Recommendation direction (sem implementar):
    - Proteger `/metrics` e normalizar labels para nomes de rota estáveis.
- Confidence:
    - High

### [F-025] [Low] [Database] Refresh tokens e invite codes sem TTL cleanup

- Status: Confirmed
- Category: Database
- Impact: crescimento desnecessário de coleções e operações de manutenção manual.
- Why this matters: ambos os documentos têm `expiresAt`, mas não há index TTL. O cleanup fica dependente de código ad hoc.
- Evidence:
    - `backend/src/models/refresh-token.model.ts:19-23`
    - `backend/src/models/account-invite-code.model.ts:16-24`
- Expected / state-of-the-art behavior:
    - Artefactos expirados devem ser limpos automaticamente quando não há razão forte para retenção.
- Current behavior:
    - Existem índices normais em `expiresAt`, não TTL.
- Risk scenario:
    - Acumulação de histórico morto degrada listas e manutenção.
- Recommendation direction (sem implementar):
    - Definir estratégia explícita de retenção e cleanup automático.
- Confidence:
    - High

### [F-026] [Low] [Backend] Snapshots de stats materializados mas não consumidos

- Status: Confirmed
- Category: Maintainability
- Impact: trabalho em background e complexidade adicional sem benefício funcional demonstrado.
- Why this matters: o scheduler escreve snapshots, mas os endpoints públicos calculam stats live com `buildStats`.
- Evidence:
    - `backend/src/modules/stats/service.ts:360-405`
    - `backend/src/modules/stats/service.ts:441-480`
- Expected / state-of-the-art behavior:
    - Dados materializados devem ter consumidor claro, invalidation definida e ganho operacional justificado.
- Current behavior:
    - `StatsSnapshotModel` é atualizado mas não lido nos endpoints analisados.
- Risk scenario:
    - A equipa assume cache/snapshot existente quando, na prática, cada request continua pesada.
- Recommendation direction (sem implementar):
    - Decidir entre remover a materialização ou passar a usá-la de forma consistente.
- Confidence:
    - High

### [F-027] [Medium] [API] `compare-budget` aceita ranges inválidos e corta silenciosamente intervalos grandes

- Status: Confirmed
- Category: API Contract
- Impact: a API pode devolver respostas enganadoras para input mal formado.
- Why this matters: não há validação de `from <= to`, e o loop termina silenciosamente após 36 meses.
- Evidence:
    - `backend/src/modules/stats/validators.ts:32-35`
    - `backend/src/modules/stats/service.ts:408-423`
- Expected / state-of-the-art behavior:
    - Range inválido deve falhar com 4xx explícito.
    - Hard limits devem ser documentados e sinalizados ao cliente.
- Current behavior:
    - O serviço aceita os dois parâmetros e trunca implicitamente após 36 meses.
- Risk scenario:
    - Cliente recebe uma comparação parcial e assume que está completa.
- Recommendation direction (sem implementar):
    - Validar ordenação do range e devolver erro quando excede limites suportados.
- Confidence:
    - High

### [F-028] [Medium] [FE <-> BE <-> BD] `currency` aceita qualquer código de 3 caracteres

- Status: Confirmed
- Category: Validation
- Impact: dados inválidos no backend podem causar erro de renderização no frontend.
- Why this matters: o backend só exige string de tamanho 3; `Intl.NumberFormat` espera uma currency ISO válida e pode lançar exceção.
- Evidence:
    - `backend/src/modules/auth/validators.ts:27-37`
    - `frontend/src/app/lib/formatting.ts:9-21`
- Expected / state-of-the-art behavior:
    - Validar currency contra enum/lista suportada, ou sanitizar/fallbackar no frontend.
- Current behavior:
    - Qualquer valor de 3 chars chega ao perfil e depois entra diretamente em `Intl.NumberFormat`.
- Risk scenario:
    - Perfil inválido provoca crash/render break em todas as vistas monetárias.
- Recommendation direction (sem implementar):
    - Fechar o conjunto de currencies aceites ou tratar fallback robusto na UI.
- Confidence:
    - High

### [F-029] [Medium] [Frontend] Derivação de `monthKey` inconsistente com contrato UTC

- Status: Confirmed
- Category: Docs Drift
- Impact: bugs plausíveis em fronteiras de mês quando cliente e backend divergem em timezone/UTC.
- Why this matters: a documentação estabelece UTC no backend e `YYYY-MM` como contrato. O frontend usa mistura de `new Date(year, month, 1)` local e `toISOString().slice(0, 7)` UTC.
- Evidence:
    - `frontend/src/app/components/month-page.tsx:258-293`
    - `frontend/src/app/components/recurring-rules-page.tsx:25-28`
    - `frontend/src/app/components/budget-editor-page.tsx:60-64`
    - `frontend/src/app/components/category-movements-page.tsx:86-91`
    - `docs/backend/business-rules.md:152-155`
- Expected / state-of-the-art behavior:
    - O frontend deve derivar/chavear meses de forma uniforme e conscientemente alinhada com o contrato.
- Current behavior:
    - Diferentes páginas calculam mês de modos diferentes.
- Risk scenario:
    - À meia-noite em timezones favoráveis, uma vista aponta para um mês e outra para outro.
- Recommendation direction (sem implementar):
    - Normalizar utilitário único para `monthKey` e alinhar com UTC do contrato.
- Confidence:
    - High

### [F-030] [Low] [Frontend/API] Vistas por categoria filtram tudo em memória após buscar o mês inteiro

- Status: Confirmed
- Category: Performance
- Impact: custo cresce linearmente com o número de lançamentos do mês.
- Why this matters: `CategoryMovementsPage` chama `getMonthSummary(month)` e depois filtra localmente por `categoryId`.
- Evidence:
    - `backend/src/modules/transactions/service.ts:116-133`
    - `frontend/src/app/components/category-movements-page.tsx:131-179`
- Expected / state-of-the-art behavior:
    - Endpoints com filtro/paginação para exploração detalhada.
- Current behavior:
    - O payload do mês inteiro é descarregado e processado na UI.
- Risk scenario:
    - Meses grandes tornam-se pesados no cliente e na API.
- Recommendation direction (sem implementar):
    - Considerar endpoint category-scoped com paginação/filtros server-side.
- Confidence:
    - High

### [F-031] [Low] [Frontend] Frontend ignora `expiresAt` de convite

- Status: Confirmed
- Category: Docs Drift
- Impact: a UI mostra apenas o código, sem informar validade temporal.
- Why this matters: o contrato devolve `expiresAt`, mas a UX não o aproveita. Isto aumenta confusão em códigos expirados.
- Evidence:
    - `backend/src/modules/accounts/service.ts:349-351`
    - `frontend/src/app/components/profile-shared-members-page.tsx:96-101`
- Expected / state-of-the-art behavior:
    - UI deve refletir validade do convite devolvida pelo backend.
- Current behavior:
    - O frontend guarda só `next.code`.
- Risk scenario:
    - Utilizador partilha um código expirado pensando que continua válido.
- Recommendation direction (sem implementar):
    - Expor `expiresAt` na UI e em estados de cópia/gestão de convites.
- Confidence:
    - High

### [F-032] [High] [Multi-account] Proteção “último owner” vulnerável a concorrência

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: uma conta partilhada pode acabar sem owner ativo, quebrando um invariante central.
- Why this matters: os fluxos contam owners dentro de transação e depois alteram um membership. Sob concorrência, duas operações sobre owners diferentes podem observar o mesmo `ownerCount` e ambas concluir.
- Evidence:
    - `backend/src/modules/accounts/service.ts:473-485`
    - `backend/src/modules/accounts/service.ts:525-538`
    - `backend/src/modules/accounts/service.ts:560-577`
    - `backend/src/modules/auth/service.ts:649-661`
    - `docs/backend/business-rules.md:38-44`
- Expected / state-of-the-art behavior:
    - O invariante “conta partilhada nunca fica sem owner ativo” deve ser garantido também sob concorrência.
- Current behavior:
    - A proteção depende de `countDocuments` + update em documentos distintos, sem constraint material adicional.
- Risk scenario:
    - Dois owners saem/demovem-se/removem-se em paralelo e a conta fica sem owner.
- Recommendation direction (sem implementar):
    - Introduzir mecanismo forte de serialização/constraint para esse invariante.
- Confidence:
    - Medium

### [F-033] [Medium] [Backend] Geração de convite pode deixar múltiplos códigos ativos em concorrência

- Status: Likely / Needs confirmation
- Category: Concurrency
- Impact: o invariante documental “novo código revoga os anteriores” pode falhar sob requests concorrentes.
- Why this matters: a operação revoga códigos ativos e cria um novo, mas não está protegida por transação/unique partial index que garanta unicidade do ativo.
- Evidence:
    - `backend/src/modules/accounts/service.ts:326-347`
    - `backend/src/models/account-invite-code.model.ts:38`
    - `docs/backend/business-rules.md:32-36`
- Expected / state-of-the-art behavior:
    - Um único código ativo por conta deve ser garantido mesmo com concorrência.
- Current behavior:
    - A implementação depende da ordem temporal das chamadas.
- Risk scenario:
    - Dois owners geram código ao mesmo tempo e ficam ambos ativos.
- Recommendation direction (sem implementar):
    - Reforçar a unicidade do estado ativo por conta.
- Confidence:
    - Medium

### [F-034] [Low] [Operations] Readiness check é superficial

- Status: Confirmed
- Category: Backend
- Impact: `/ready` pode responder pronto enquanto dependências críticas ainda não estão funcionalmente saudáveis.
- Why this matters: `mongoose.connection.readyState === 1` não valida primary reachability, capacidade transacional nem outros componentes opcionais importantes.
- Evidence:
    - `backend/src/app.ts:88-95`
    - `backend/src/config/db.ts:18-20`
- Expected / state-of-the-art behavior:
    - Readiness deve refletir a capacidade real de servir tráfego relevante.
- Current behavior:
    - O check limita-se ao estado de conexão do mongoose.
- Risk scenario:
    - O orchestrator começa a enviar tráfego enquanto operações transacionais ou downstreams ainda falham.
- Recommendation direction (sem implementar):
    - Tornar readiness mais representativo dos requisitos reais de serving.
- Confidence:
    - High

### [F-035] [Medium] [Privacy/Operations] Insight IA envia dados financeiros agregados por defeito

- Status: Confirmed
- Category: State-of-the-Art Gap
- Impact: há transferência de dados financeiros agregados para um terceiro provider por default funcional.
- Why this matters: embora o payload seja anonimizado, continua a conter séries temporais e agregados financeiros da conta. O frontend dispara o enrichment automaticamente e o backend assume `includeInsight=true` por default.
- Evidence:
    - `backend/src/modules/stats/service.ts:363-405`
    - `backend/src/modules/stats/insight.service.ts:201-280`
    - `backend/src/modules/stats/insight.service.ts:466-499`
    - `frontend/src/app/components/stats-page.tsx:120-126`
    - `docs/backend/api-reference.md:610-622`
- Expected / state-of-the-art behavior:
    - Transferências para terceiros devem ser explicitamente governadas, configuráveis e idealmente opt-in para dados financeiros.
- Current behavior:
    - O enrichment é pedido automaticamente pela UI quando a feature está configurada.
- Risk scenario:
    - Ambiente de produção envia dados agregados de utilizadores sem controlo explícito de consentimento/política por tenant.
- Recommendation direction (sem implementar):
    - Rever default, controlo de feature e governança/consentimento para este enrichment.
- Confidence:
    - High

### [F-036] [Medium] [CI/CD] CI sem gates modernos de security/supply-chain/secret scanning

- Status: Confirmed
- Category: CI/CD
- Impact: falhas de segurança e hygiene podem passar para main/deploy sem deteção dedicada.
- Why this matters: a pipeline atual faz build/test/lint, mas não inclui `npm audit`, audit signatures/provenance, secret scan, SAST ou gate equivalente.
- Evidence:
    - `.github/workflows/ci.yml:8-74`
    - `backend/.env:3-12`
- Expected / state-of-the-art behavior:
    - CI moderna para npm deve incluir pelo menos scanning de segredos e checks dedicados de supply chain.
- Current behavior:
    - Não existem jobs/steps dedicados a segurança de dependências ou segredos.
- Risk scenario:
    - Dependências vulneráveis, provenance fraca ou segredos acidentais entram sem travão automático.
- Recommendation direction (sem implementar):
    - Adicionar security gates específicos em CI e branch protection associada.
- Confidence:
    - High

### [F-037] [Medium] [Testing] Faltam testes automatizados para riscos críticos de auth/session/concurrency

- Status: Confirmed
- Category: Testing
- Impact: regressões de segurança e multi-conta têm elevada probabilidade de passar sem sinal.
- Why this matters: existem testes úteis, mas faltam cenários diretamente ligados aos riscos mais severos encontrados nesta auditoria.
- Evidence:
    - `docs/backend/testing.md:84-102`
    - command output: `find backend/src/tests -maxdepth 2 -type f`
    - command output: `find frontend/src -name '*test.ts*'`
- Expected / state-of-the-art behavior:
    - Cobertura automatizada para reuse detection, password-change invalidation, corridas de último owner, stale response account-switch, retries não idempotentes e cenários multi-tab/session.
- Current behavior:
    - A suíte cobre flows felizes e algumas regras críticas, mas não estes cenários específicos.
- Risk scenario:
    - Ajustes futuros em auth/http client/ownership quebram invariantes sem falha de pipeline.
- Recommendation direction (sem implementar):
    - Priorizar testes de segurança/concurrency exatamente nos pontos desta auditoria.
- Confidence:
    - High

## 5. Cross-Cutting Risks

- Trust excessivo em dados vindos do cliente:
    - `origin` de transação
    - `currency`
    - contexto implícito de conta quando falta header
- Invariantes críticos dependem de lógica aplicacional sem constraints fortes:
    - último owner
    - um código de convite ativo
    - coerência entre categorias, budget e transações
- Modelo de sessão fica aquém do estado da arte:
    - refresh rotation incompleta
    - revogação parcial
    - storage exposto no browser
    - retry automático de requests mutáveis
- Drift entre intenções documentadas e comportamento real:
    - setup Mongo/transações
    - coerência UTC no frontend
    - contratos devolvidos e não consumidos (`expiresAt`)
- Reparação implícita no runtime mascara problemas estruturais:
    - `getBudget` corrige drift em leitura
    - snapshots de stats são produzidos sem estratégia clara de leitura
- Operação/observabilidade insuficientes para produção real:
    - `/metrics` público
    - readiness superficial
    - cron sem coordenação distribuída
    - CI sem gates modernos de segurança

## 6. FE <-> BE <-> BD Contract Mismatches

| Tema                 | Contrato/intenção                                               | Comportamento real                                    | Evidência                                                                                                               | Risco                                          |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Contexto de conta    | FE deve operar na conta ativa e injetar `X-Account-Id`          | Backend aceita omissão e cai para conta pessoal       | `frontend/src/app/lib/http-client.ts:30-35`, `backend/src/middleware/account-context.ts:24-33`                          | Escritas/leitura no tenant errado              |
| Categoria de despesa | Budget e transações devem usar taxonomia coerente do mês        | Backend aceita qualquer `categoryId` não vazio        | `backend/src/modules/transactions/service.ts:95-114`                                                                    | Dados órfãos/invisíveis                        |
| Remoção de categoria | Categoria removida não deveria apagar visibilidade de histórico | UI deriva tudo de `budget.categories`                 | `frontend/src/app/components/month-page.tsx:434-474`                                                                    | Gastos desaparecem da vista principal          |
| Convites             | Backend devolve `code` + `expiresAt`                            | FE guarda só `code`                                   | `backend/src/modules/accounts/service.ts:349-351`, `frontend/src/app/components/profile-shared-members-page.tsx:96-101` | UX enganadora com códigos expirados            |
| `totalBudget`        | Backend é source of truth derivada de incomes                   | Coerência depende de sync pós-escrita não atómico     | `backend/src/modules/transactions/service.ts:177-179`, `backend/src/modules/budgets/service.ts:266-279`                 | Drift entre receita e orçamento                |
| Mês/UTC              | Backend define semântica UTC para mês                           | FE usa mistura de local time e UTC                    | `docs/backend/business-rules.md:152-155`, `frontend/src/app/components/month-page.tsx:258-293`                          | Bugs em fronteiras de mês                      |
| Stats insight        | Enrichment é opcional                                           | FE pede automaticamente enrichment IA                 | `frontend/src/app/components/stats-page.tsx:120-126`, `docs/backend/api-reference.md:610-622`                           | Transferência a terceiro por default funcional |
| `currency`           | Contrato implícito de moeda válida                              | Backend aceita qualquer 3-char e FE assume ISO válida | `backend/src/modules/auth/validators.ts:27-37`, `frontend/src/app/lib/formatting.ts:18-21`                              | Crash/render break                             |

## 7. Security Gaps vs Modern Baseline

### OWASP ASVS 5.0 / general security engineering

- Sessão/Auth:
    - F-002, F-003, F-005, F-006, F-007, F-017
- Secrets management:
    - F-001, F-036
- Authorization / tenant isolation:
    - F-015, F-016, F-032
- Data validation / integrity:
    - F-008, F-009, F-012, F-028
- Operational hardening:
    - F-021, F-022, F-024, F-034

### OWASP API Security Top 10 2023

- API1 Broken Object Level Authorization / tenant context risk:
    - F-015, F-016
- API3 Broken Object Property Level Authorization / mass assignment style overposting:
    - F-008
- API4 Unrestricted Resource Consumption:
    - F-022, F-024, F-030
- API8 Security Misconfiguration:
    - F-001, F-002, F-021, F-024, F-034, F-036
- API10 Unsafe Consumption of APIs:
    - F-035

### RFC 8725 (JWT BCP)

- Falta de algorithm pinning e claims contextuais:
    - F-003
- Gestão de segredos inadequada:
    - F-002
- Lifecycle/session invalidation incompleta:
    - F-005, F-006, F-007, F-019

### Express / Node.js / MongoDB / npm production baselines

- Express/Node:
    - `trust proxy` hardcoded (F-021)
    - `/metrics` exposto (F-024)
    - readiness superficial (F-034)
- MongoDB:
    - dependência real de transações não refletida no setup (F-020)
    - invariantes sem constraints fortes (F-032, F-033)
    - retenção/crescimento desnecessário (F-025)
- npm / supply chain:
    - FE lockfile com vulnerabilidades conhecidas (`npm audit --package-lock-only` apontou `flatted` e `vite`)
    - ausência de gates CI para audit/provenance/secret scanning (F-036)

## 8. Test Coverage Gaps

- Prioridade máxima:
    - Reuse detection de refresh token comprometido
    - Revogação automática de sessões ao mudar password
    - Corridas de “último owner” em `updateMemberRole`, `removeMember`, `leaveAccount`, `deleteMe`
    - Criação manual com `origin=recurring`
    - Rejeição de `expense.categoryId` fora do budget
    - Remoção de categoria com transações históricas referenciadas
- Frontend crítico:
    - Race de `MonthPage` ao trocar de conta
    - Retry de POST/PUT/DELETE após refresh
    - Coordenação multi-tab no refresh flow
    - Proteção contra exibição de dados stale entre contas
- Operação:
    - Smoke test de scheduler em ambiente multi-instância
    - Teste de startup/readiness com Mongo sem suporte transacional
    - Testes de `/metrics` exposure e cardinalidade
- Observação de ambiente:
    - nesta auditoria não foi possível executar os checks frontend por problema local de dependências/binários, o que reduz o sinal prático disponível sobre regressões atuais na UI

## 9. Docs vs Implementation Drift

| Tema                   | Documentado                                                  | Implementado                                                 | Risco                                            |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ |
| Mongo setup            | `MongoDB local ou Atlas`; replica set “recomendado”          | código usa transações em flows críticos                      | instalações “válidas” pela doc falham em runtime |
| Contrato UTC/mês       | backend define fronteiras de mês em UTC                      | frontend deriva mês de formas inconsistentes                 | bugs timezone e drift de UX                      |
| Convite partilhado     | contrato devolve `expiresAt`                                 | UI ignora campo                                              | UX e suporte operacional piores                  |
| Concorrência FE        | docs indicam robustez para mudanças rápidas de conta/periodo | `MonthPage` não tem guard equivalente ao `StatsPage`         | data leakage visual entre contas                 |
| Budget source of truth | docs afirmam backend source of truth                         | coerência depende de sync pós-escrita e reparação em leitura | drift silencioso e side effects escondidos       |
| Invólucro de segurança | docs avisam para nunca commitar `.env` com segredos          | workspace local contém segredos ativos de desenvolvimento    | risco operacional no ambiente local/dev          |

## 10. Prioritized Remediation Order

### P0 imediatos

- Rodar e substituir imediatamente os segredos expostos do `MongoDB` e `OpenAI`.
- Remover segredos ativos de desenvolvimento/testes do workspace do repositório e ativar secret scanning.
- Fechar o overposting de `origin=recurring`.
- Corrigir o modelo de sessão:
    - segredos JWT fortes obrigatórios
    - revogação ao mudar password
    - reuse detection/chain revocation
- Impedir persistência de despesas com categorias inválidas/orfandade de categoria.
- Corrigir o risco de mistura de dados entre contas no `MonthPage`.

### P1 curto prazo

- Rever storage de tokens no frontend e política de retry automático.
- Endurecer `X-Account-Id`/account context com fail-closed nos endpoints relevantes.
- Corrigir/documentar de forma inequívoca a dependência de replica set/transações.
- Reforçar proteção de “último owner” contra concorrência.
- Fechar `/metrics` e reduzir cardinalidade de labels.

### P2 médio prazo

- Tornar scheduler seguro para multi-instância.
- Reestruturar `totalBudget` para consistência mais forte.
- Remover side effects de GET em `getBudget`.
- Introduzir TTL/retention policy para artefactos expirados.
- Harmonizar derivação de `monthKey` no frontend.
- Rever governança/opt-in do insight IA.

### P3 melhorias estruturais

- Decidir entre usar de facto `StatsSnapshot` ou remover a materialização.
- Introduzir endpoints filtrados/paginados para exploração detalhada de movimentos.
- Expandir a suíte de testes para auth/session/concurrency/multi-account.
- Adicionar CI security gates modernos: audit, provenance/signatures, secret scanning, SAST.

## 11. Appendix

### Comandos executados

```bash
node -v
npm -v
cd backend && npm ci
cd frontend && npm ci
cd backend && npm run build
cd backend && npm run test:unit
cd backend && npm run test:integration
cd backend && npm audit --package-lock-only
cd frontend && npm audit --package-lock-only
cd backend && npm audit signatures --package-lock-only
cd frontend && npm audit signatures --package-lock-only
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test
cd frontend && npm run build
git ls-files backend/.env frontend/.env backend/.env.example
```

### Outputs relevantes

- `backend npm run build`:
    - sucesso
- `backend npm run test:unit`:
    - sucesso, `30 tests`
- `backend npm run test:integration`:
    - falhou por ambiente/sandbox com `listen EPERM: operation not permitted 0.0.0.0`
- `frontend npm run typecheck/lint/test/build`:
    - falharam com `tsc/eslint/vitest/vite: command not found`
- `backend npm audit --package-lock-only`:
    - `found 0 vulnerabilities`
- `frontend npm audit --package-lock-only`:
    - vulnerabilidades conhecidas em `flatted <=3.4.1` e `vite 6.0.0 - 6.4.0`
- `npm audit signatures --package-lock-only`:
    - falhou por `EACCES` na cache local npm
- `npm ci` backend/frontend:
    - falhou por `EACCES` em `node_modules`

### Ficheiros lidos

- Documentação SSOT listada na secção 2
- Código principal auditado em:
    - `backend/src/app.ts`
    - `backend/src/config/*`
    - `backend/src/middleware/*`
    - `backend/src/modules/**/*`
    - `backend/src/models/*`
    - `backend/src/jobs/scheduler.ts`
    - `backend/src/tests/**/*`
    - `frontend/src/app/**/*`
    - `frontend/src/main.tsx`
    - `.github/workflows/ci.yml`

### Notas de ambiente

- O worktree estava sem alterações trackadas antes da criação deste report.
- `backend/.env` estava presente no workspace mas não trackado pelo Git nesta auditoria.
- O estado local de dependências limitou a execução dos checks frontend e de `npm ci`.

### Dúvidas em aberto

- F-019: a race multi-tab do refresh é tecnicamente muito provável, mas exigiria reprodução controlada em browser com vários tabs para confirmação empírica.
- F-023: a duplicação do scheduler depende do modo de deploy efetivo; se existir uma única instância dedicada, o risco atual baixa.
- F-032: a race do último owner precisa de teste concorrente/instrumentado para confirmação empírica, embora a estrutura atual já seja vulnerável por desenho.
- F-033: a race de convites também requer reprodução concorrente para confirmar frequência real.
