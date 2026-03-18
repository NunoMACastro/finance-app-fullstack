# Backend Operacao e Manutencao

## Startup sequence

`src/server.ts`:
1. `connectDb()`
2. cria app Express
3. inicia listener HTTP
4. inicia scheduler (`startScheduler()`)

Se bootstrap falhar, processo termina com `exit(1)`.

## Scheduler

Arquivo: `src/jobs/scheduler.ts`

- Cron expression: `10 0 * * *` (00:10 diario)
- Timezone: `env.TIMEZONE`
- Desativado quando:
  - `CRON_ENABLED=false`
  - `NODE_ENV=test`

Fluxo do job diario:
1. calcula mes atual (`monthFromDate`, UTC)
2. gera transacoes recorrentes para todas as contas (vencidas ate ao dia UTC atual)
3. materializa snapshots de stats (`semester` e `year`) para cada conta

Metrica/log de recorrencias:
- `totalCreated`
- `totalFallbackCreated`
- `totalProcessedRules`

## Migracao de contas

Script: `npm run migrate:accounts`
Arquivo: `src/scripts/migrate-accounts.ts`

O que faz:
1. garante conta pessoal para cada user (`ensurePersonalAccountForUser`)
2. backfill de `accountId` em colecoes financeiras sem accountId
3. garante membership owner ativa para conta pessoal
4. escreve logs de contagens por etapa

Quando executar:
- apos deploy de mudancas de modelo para multi-conta,
- apos import de dados legados,
- quando detectar users sem `personalAccountId`.

## Health checks

- `/health`: liveness simples
- `/ready`: readiness dependente da ligacao Mongo

Uso recomendado:
- Load balancer / orchestrator deve usar `/ready` para traffic gating.

## Logs

- Logger: `pino`
- Em dev usa `pino-pretty`
- Cada request recebe `x-request-id`
- DB URI e mascarada nos logs de conexao

## Erros operacionais comuns

### API retorna 503 em `/ready`
Causas provaveis:
- Mongo indisponivel
- credenciais erradas
- firewall/IP whitelist

Validacao:
- verificar `MONGODB_URI`
- verificar logs de bootstrap

### 401 frequente no frontend
Causas:
- segredos JWT alterados sem invalidar sessoes
- expiracao refresh token

Acoes:
- pedir novo login
- verificar `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` consistentes entre instancias

### 403 em endpoints financeiros
Causa:
- user sem membership ativa no `X-Account-Id` enviado.

Acoes:
- chamar `GET /accounts`
- confirmar `activeAccountId` no frontend

### 422 `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS`
Causa:
- tentativa de create/update manual sem budget valido no mes.

Acoes:
- criar/ajustar budget ate 100%

### Recorrencias com fallback pendente
Causa:
- regra recorrente com `pendingFallbackCount > 0`
- tipicamente categoria removida/inativa (`income`) ou ausente no budget (`expense`)

Acoes:
- usar `POST /recurring-rules/:id/reassign-category`
- decidir se migra historico (`migratePastFallbackTransactions=true`) ou apenas futuras geracoes.

### Stats sem insight IA
Causa:
- `OPENAI_API_KEY` ausente/invalida
- timeout no provider (`OPENAI_INSIGHT_TIMEOUT_MS`)
- erro temporario da API OpenAI
- chamada com `includeInsight=false` (cliente pediu snapshot base sem IA)

Comportamento esperado:
- endpoints `/stats/semester` e `/stats/year` continuam a responder `200`
- payload de stats vem sem campo `insight` (fallback gracioso no frontend)

### Exposicao de segredo detetada
Causa:
- chave/API token partilhado por engano em commit, log, screenshot ou canal externo.

Acoes:
- revogar/rodar imediatamente o segredo no provider;
- atualizar variavel no ambiente de runtime;
- reiniciar/redeploy da aplicacao;
- rever historico de logs e acessos do periodo exposto.

## Checklist pre-producao backend

- Variaveis obrigatorias em producao configuradas
- `CORS_ORIGIN` nao e `*`
- Mongo em replica set (recomendado para transacoes)
- scheduler ligado no ambiente correto
- `npm run test` verde
- monitorizacao em `/metrics` integrada
