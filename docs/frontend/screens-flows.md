# Frontend Ecras e Fluxos

## 1) Auth

Entrada quando nao autenticado.

Fluxos:
- login
- registo

Acoes:
- sucesso -> guarda tokens e profile
- erro -> mensagem via UI (toast/feedback)

## 2) Header global

Elementos:
- dropdown de conta ativa
- icone `+` para criar orcamento partilhado
- icone para entrar por codigo
- badge de perfil
- logout
- botao tutorial
- botao de membros (apenas owner em conta shared)

Dialogs:
- criar conta partilhada
- entrar por codigo
- gerir membros (owner)

## 3) Month page

### Fluxo de carregamento
1. calcula mes ativo
2. chama em paralelo resumo + budget
3. renderiza cards, listas e progresso

### Fluxo de novo lancamento
1. user toca `Novo lancamento`
2. se `canWriteFinancial=false`: bloqueado
3. se `budget.isReady=false`: abre editor de budget
4. se pronto: abre dialog de lancamento
5. submit -> `transactionsApi.create`
6. sucesso -> reload dados do mes

### Fluxo de editar budget
1. abre `BudgetEditorDialog`
2. opcionalmente aplica template
3. edita categorias/pesos
4. guardar -> `budgetApi.save`
5. backend valida soma = 100

### Fluxo de recorrencias
- criar/editar/apagar regra recorrente
- gerar no mes atual

### Empty states e estados de erro
- loading state com spinner
- erro de fetch com CTA `Tentar novamente`
- sem budget pronto:
  - card CTA para criar orcamento
  - bloqueio de acoes de escrita manual
- viewer mode:
  - aviso de modo leitura

## 4) Stats page

### Fluxo de carregamento
1. escolher periodo (`6M`/`12M`)
2. chamar endpoint correspondente
3. renderizar KPIs, trend, pie, budget vs actual, detalhe categorias, forecast

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

## 5) Tutorial por pagina

Comportamento:
- auto somente quando `tutorialSeenAt` for `null`
- escopo dinamico por rota atual:
  - em `/` mostra tour month
  - em `/stats` mostra tour stats
- nao faz navegacao forcada
- marca visto em skip ou done

## 6) Troca de conta ativa

1. user troca no dropdown
2. `AccountContext` atualiza header local + storage
3. novas chamadas API passam `X-Account-Id` atualizado
4. Month/Stats recarregam com novo dataset

Fallback:
- se conta guardada localmente ficar invalida,
  - contexto cai para conta pessoal automaticamente

