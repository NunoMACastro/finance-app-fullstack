# Frontend Ecras e Fluxos

## 1) Auth

Entrada quando nao autenticado.

Fluxos:
- login (default)
- registo via link textual no login
- retorno para login via link textual no registo

Estrutura visual:
- topo (hero) com gradiente do tema + logo/nome centrados
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

### Fluxo de recorrencias
- criar/editar/apagar regra recorrente
- gerar no mes atual

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
2. chamar endpoint correspondente
3. renderizar KPIs, trend, pie, budget vs actual, detalhe categorias, forecast

Escopo funcional v1:
- stats são sempre da conta ativa (`account-scoped`), sem agregação global entre contas nesta vaga
- troca de conta no seletor (quando visível) recarrega os dados de stats dessa conta

### Interacoes
- selecao de ponto no grafico de tendencia
- destaque por categoria (pie + listas)
- expandir detalhe por categoria

### Empty states e erro
- loading state
- erro de API com mensagem + retry
- sem dados suficientes:
  - componentes mostram valores zero de forma consistente
- sem crash

## 5) Profile page (`/profile`)

Arquitetura de navegacao:
- `/profile` (hub): lista flat de secções
- `/profile/account`
- `/profile/security`
- `/profile/preferences`
- `/profile/shared` (hub de partilha)
- `/profile/shared/accounts`
- `/profile/shared/create`
- `/profile/shared/join`
- `/profile/shared/members`

Fluxos:
- Hub -> secção (tap numa linha)
- Em cada secção, `Voltar` regressa sempre a `/profile`
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
- Preferences:
  - tema (`brisa|calma|aurora|terra`)
  - ocultar valores por defeito
  - reset tutorial
- Shared:
  - hub com entradas para contas, criar, join e membros
  - accounts: trocar conta ativa + sair da conta ativa
  - create: criar conta partilhada
  - join: entrar por código
  - members (owner): gerar convite + gerir membros

## 6) Tutorial por pagina

Comportamento:
- auto somente quando `tutorialSeenAt` for `null`
- escopo dinamico por rota atual:
  - em `/` mostra tour month
  - em `/stats` mostra tour stats
- passo do seletor de conta é omitido automaticamente quando o seletor não está visível
- passos cujo alvo não existe no estado atual do ecrã são omitidos automaticamente
- nao faz navegacao forcada
- marca visto em skip ou done

## 7) Troca de conta ativa

1. user troca no dropdown
2. `AccountContext` atualiza header local + storage
3. novas chamadas API passam `X-Account-Id` atualizado
4. Month/Stats recarregam com novo dataset

Fallback:
- se conta guardada localmente ficar invalida,
  - contexto cai para conta pessoal automaticamente
