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
- toggle para mostrar/ocultar valores (session override)
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
2. chama em paralelo resumo + budget + categorias de receita
3. renderiza cards, listas e progresso

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

## 5) Profile page (`/profile`)

Secoes:
- Conta:
  - nome e moeda
  - atualizacao de email com password atual
- Seguranca:
  - alterar password
  - listar sessoes
  - revogar sessao individual
  - revogar todas as sessoes
- Preferencias:
  - paleta de tema (`brisa|calma|aurora|terra`)
  - ocultar valores por defeito
  - reset tutorial
- Dados e privacidade:
  - export JSON
  - desativar conta (confirmacao forte + password)
- Contas partilhadas (hibrido):
  - lista de contas e role
  - trocar conta ativa
  - criar/join/leave
  - gerir membros (owner)

## 6) Tutorial por pagina

Comportamento:
- auto somente quando `tutorialSeenAt` for `null`
- escopo dinamico por rota atual:
  - em `/` mostra tour month
  - em `/stats` mostra tour stats
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
