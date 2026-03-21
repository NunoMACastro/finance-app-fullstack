# Frontend Ecras e Fluxos

## 1) Auth

Entrada quando nao autenticado.

Fluxos:
- login (default)
- registo via link textual no login
- retorno para login via link textual no registo

Estrutura visual:
- topo (hero) com superfície de marca do tema (gradiente ou sólido) + logo/nome centrados
- separador curvo estatico entre hero e corpo
- corpo flat sem cards/sombras
- patch notes no fundo da pagina (quando visiveis), em login e registo

Acoes:
- sucesso -> guarda tokens e profile
- erro -> mensagem via UI (toast/feedback)

## 2) Header global

Elementos:
- marca (logo + nome app)
- toggle para mostrar/ocultar valores (session override)
- botao tutorial
- botao sair

Comportamento:
- seletor de conta ativa aparece abaixo do header apenas quando:
  - existem contas partilhadas disponíveis para troca
  - a rota atual é `/` (Mês) ou `/stats`
- o seletor fica oculto em ecrãs não contextuais:
  - `/profile` e subpáginas
  - `/budget/:month/edit`
  - ecrã de movimentos por categoria (`/month/:month/category/:categoryId/movements`)

## 3) Month page

### Fluxo de carregamento
1. calcula mes ativo
2. chama em paralelo resumo + budget + categorias de receita
3. renderiza hero de orcamento, regua financeira do mes, categorias flat de despesa e receitas compactas

### Fluxo de novo lancamento
1. user toca `Novo lancamento`
2. se `canWriteFinancial=false`: bloqueado
3. se `budget.isReady=false`: navega para `/budget/:month/edit`
4. se pronto: abre dialog de lancamento
5. submit -> `transactionsApi.create`
6. sucesso -> reload dados do mes

### Fluxo de editar budget
1. user abre rota `/budget/:month/edit`
2. opcionalmente aplica template
3. edita categorias/pesos
4. guardar -> `budgetApi.save`
5. backend valida soma = 100
6. voltar para month page e recarregar resumo/budget

### Fluxo de categorias de receita
- listar categorias da conta ativa (`incomeCategoriesApi.list`)
- criar categoria (`incomeCategoriesApi.create`)
- editar nome ou estado ativo (`incomeCategoriesApi.update`)
- remover (soft-delete) categoria (`incomeCategoriesApi.remove`)
- categoria default existe sempre e nao pode ser removida/desativada

### Fluxo de recorrencias (ecrã dedicado)
Entrada principal:
- no dialog `Novo lançamento`, atalho `Gerir recorrências automáticas`

Entrada secundaria:
- hub de `Profile` via linha `Recorrências`

Fluxo:
1. abrir `/profile/recurring` (alias suportado: `/recurring/*`)
2. listar regras ativas/pausadas com estado de saude (`ok`/`fallback`)
3. criar/editar/pausar/apagar regra
4. opcionalmente executar `Gerar agora` para o mes atual
5. se houver fallback pendente, usar `Reatribuir categoria`
6. toggle opcional `Migrar histórico em fallback` para corrigir transacoes antigas da regra

### Fluxo de categorias de despesa (Month Financial Stack)
1. utilizador toca numa linha de categoria
2. app abre `bottom sheet` em modo preview (ultimas 8 saídas + resumo)
3. utilizador pode tocar `Ver todas` para abrir ecrã completo de movimentos da categoria
4. no ecrã completo, aplica pesquisa direta e filtros avançados via botão `Filtros` (sheet)
5. se `canWriteFinancial=true`, lançamentos manuais podem ser removidos (preview e ecrã completo)
6. `Voltar` no ecrã completo regressa a `/?month=YYYY-MM` sem perder contexto mensal

Ordenacao hibrida da lista:
- categorias `expense`: urgencia (`over > warning > normal`), depois `% usado`, depois nome
- categorias `reserve`: ficam no fim e mantem ordem do orçamento (fallback alfabético)
- `reserve` a 100% nao sobe ao topo por pressao; apenas excesso real pode receber tom de alerta

### Empty states e estados de erro
- loading state com skeletons (inclui a regua financeira para reduzir layout shift)
- erro de fetch com mensagem curta + CTA `Tentar novamente`
- sem budget pronto:
  - card CTA para criar orcamento
  - regua financeira mostra estado `Orcamento por definir` (sem `€/dia` calculado)
  - bloqueio de acoes de escrita manual
- viewer mode:
  - aviso de modo leitura

## 4) Stats page

### Fluxo de carregamento
1. escolher periodo (`6M`/`12M`)
2. pedir snapshot base e renderizar imediatamente:
   - `Pulse do período` (saldo + breakdown financeiro + microcopy local)
   - `Drivers` (top 3 categorias críticas)
   - `Tendência` (receitas/despesas/saldo)
   - `Projeção` (3M/6M + confiança)
3. mostrar CTA compacto `Abrir análise IA`
4. navegar para `/stats/insights?period=...&forecastWindow=...`

Escopo funcional v1:
- stats são sempre da conta ativa (`account-scoped`), sem agregação global entre contas nesta vaga
- troca de conta no seletor (quando visível) recarrega os dados de stats dessa conta
- abrir `/stats` nunca dispara pedidos de insight IA

### Interacoes
- selecao de ponto no grafico de tendencia
- tap em driver abre `sheet` contextual de detalhe da categoria
- no `sheet`, CTA opcional para abrir movimentos da categoria no mês mais recente
- CTA `Abrir análise IA` navega para a página dedicada e preserva contexto (`period`, `forecastWindow`), embora a página dedicada não exponha esse ajuste como controlo visível

Linhas do `Pulse` (ordem fixa):
1. `Receitas`
2. `Consumo`
3. `Poupanças`
4. `Valor por alocar` (>=0) / `Valor em falta` (<0)
5. `Aderência ao orçamento` (desvio absoluto agregado por categoria convertido em percentagem)
6. `Taxa de poupança`
7. `Taxa por alocar` (>=0) / `Taxa em falta` (<0)
8. `Poupança total potencial`

### Empty states e erro
- loading state com skeletons estáveis
- erro de API com mensagem + retry
- sem dados suficientes:
  - `Pulse` e `Drivers` degradam para mensagens curtas sem quebrar layout
- sem crash

## 5) Stats insights page (`/stats/insights`)

### Fluxo de carregamento
1. abrir a página a partir de `/stats` ou por deep link com `period`/`forecastWindow`
2. mostrar o período atual em modo read-only
3. mostrar estado inicial vazio, sem disparar pedidos ao backend
4. quando o utilizador toca `Gerar insight IA`:
   - `POST /stats/insights`
   - se `ready`, renderizar imediatamente
   - se `pending`, iniciar polling de `GET /stats/insights/:id`
   - se o polling falhar repetidamente, pausar a verificação automática e mostrar CTA `Retomar verificação`
   - se `failed`, mostrar erro curto + retry

### Interacoes
- `Gerar novamente` repete o fluxo para o contexto atual
- `Voltar` regressa a `/stats`

### Conteúdo
- topo curto com resumo executivo e metadata
- tabs internas:
  - `Agora`
  - `Ações`
  - `Categorias`
- `Agora` mostra no máximo os sinais mais importantes do período
- `Ações` mostra a lista priorizada de próximas ações
- `Categorias` mostra a lista completa de categorias em foco
- quando o backend devolver `colorSlot` por categoria, a tab `Categorias` reutiliza as cores estáveis do budget; sem esse campo, usa fallback neutro

## 6) Profile page (`/profile`)

Arquitetura de navegacao:
- `/profile` (hub): lista flat de secções
- `/profile/account`
- `/profile/security`
- `/profile/preferences`
- `/profile/recurring` (gestao dedicada de recorrencias)
- `/recurring/*` (alias de compatibilidade para o mesmo ecrã)
- `/profile/shared` (hub de partilha)
- `/profile/shared/accounts`
- `/profile/shared/create`
- `/profile/shared/join`
- `/profile/shared/members`

Fluxos:
- Hub -> secção (tap numa linha)
- Em subpáginas de perfil, `Voltar` regressa a `/profile`
- Exceção: em recorrências, `Voltar` é contextual (`state.from`) e pode regressar a `/` quando entrada veio do Month
- Em subrotas de partilha (`/profile/shared/*`), `Voltar` regressa sempre a `/profile/shared`
- `create/join` de conta partilhada existe apenas no hub de perfil/subrotas de partilha (sem duplicação no header/shell)

Conteúdo por secção:
- Account:
  - nome e moeda
  - atualizacao de email com password atual
  - export JSON
  - desativar conta (confirmacao forte + password)
- Security:
  - alterar password
  - listar sessoes
  - revogar sessao individual
  - revogar todas as sessoes
  - remover sessões já revogadas do histórico
- Preferences:
  - tema (`brisa|calma|aurora|terra|mare|amber|ciano`)
  - labels visiveis no seletor: `Brisa`, `Calma`, `Aurora`, `Terra`, `Maré`, `Ambar`, `Ciano`
  - ocultar valores por defeito
  - reset tutorial
- Shared:
  - hub com entradas para contas, criar, join e membros
  - accounts: trocar conta ativa + sair da conta ativa
  - create: criar conta partilhada
  - join: entrar por código
  - members (owner): gerar convite + gerir membros

## 7) Tutorial por pagina

Comportamento:
- auto somente quando `tutorialSeenAt` for `null`
- escopo dinamico por rota atual:
  - em `/` mostra tour month
  - em `/stats` mostra tour stats
- passo do seletor de conta é omitido automaticamente quando o seletor não está visível
- passos cujo alvo não existe no estado atual do ecrã são omitidos automaticamente
- no escopo `stats`, o tutorial explica separadamente:
  - saldo do período
  - breakdown do pulse (consumo, poupanças, por alocar/em falta, aderência, taxas, potencial)
  - CTA para abrir a análise IA dedicada
- nao faz navegacao forcada
- marca visto em skip ou done

## 8) Troca de conta ativa

1. user troca no dropdown
2. `AccountContext` atualiza header local + storage
3. novas chamadas API passam `X-Account-Id` atualizado
4. Month/Stats recarregam com novo dataset

Fallback:
- se conta guardada localmente ficar invalida,
  - contexto cai para conta pessoal automaticamente
