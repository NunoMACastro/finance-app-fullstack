# UI v3 Spec (Estrutura e Coerência Visual)

## Objetivo

Esta especificação define os contratos de estrutura visual da UI v3 para evitar drift entre ecrãs e PRs.

Normativa:
- `MUST`: obrigatório.
- `SHOULD`: recomendado; exceções devem ser justificadas no PR.
- `MAY`: opcional.

## 1. Princípios de Composição

- A UI `MUST` ser `flat & compacta`: menos molduras, menos camadas visuais e maior densidade útil.
- Cada secção `MUST` ter no máximo 2 níveis de superfície visível.
- Cada viewport `MUST` ter no máximo 1 CTA primária destacada.
- A hierarquia `MUST` ser guiada por tipografia, ritmo e agrupamento; não por sombras pesadas.
- Estados vazios críticos `MUST` incluir ação clara (CTA).

## 2. Grid, Spacing e Radius

- Escala de spacing permitida (`MUST`): `4/8/12/16/24/32`.
- Radius permitido (`MUST`):
  - Controlo: `12px` (`rounded-xl`)
  - Superfície: `16px` (`rounded-2xl`)
- CTAs primárias e secundárias (`MUST`) usar `rounded-xl` (não `rounded-full`).
- `rounded-full` (`MAY`) apenas para badges/chips, dots decorativos e barras/progress.
- Exceções de radius (`MAY`): overlays/sheets/dialogs até `20px`, com justificação funcional.
- Elevação (`MUST`): `0` por defeito; sombra apenas para overlays/dialogs/sheets.
- Touch targets (`MUST`): mínimo equivalente a `44px`.

## 3. Shell Global v3

- O runtime `MUST` usar:
  - `AppShellV3`
  - `TopBarV3`
  - `BottomNavV3`
- `TopBarV3` `MUST` ser compacto com:
  - marca (logo + nome)
  - ações globais de ícone (privacidade, tutorial, sair)
- O seletor de conta ativa `MUST` ser contextual:
  - aparece apenas quando existe conta `shared`
  - aparece apenas em `/` e rotas `startsWith("/stats")`
  - fica oculto nas restantes rotas

## 4. Regras por Componente

### Header / Top Bar
- `MUST` ser funcional e compacto (sem caixa decorativa gigante).
- `MUST` manter `aria-label` em botões de ícone.

### Bottom Navigation
- Estado ativo `MUST` ser claro mas discreto (cor + marcador), sem bloco pesado.

### Cards/Sections
- `SHOULD` privilegiar superfícies simples com borda sem sombras de cartão.
- `MUST` evitar card dentro de card sem necessidade funcional.

### Page Headers
- `MUST` usar `PageHeaderV3` nas páginas com padrão repetido de header (título + subtítulo + ações).
- `MUST` normalizar título de página para `text-base`.

### Segmented Controls
- `MUST` usar `SegmentedControlV3` para seletores segmentados (evitar implementações ad-hoc).
- tamanhos permitidos:
  - `default` (`h-11`) para seletor principal de página
  - `compact` (`h-9`) para uso inline denso

### Botões e Interações
- `MUST` usar `<Button>` por defeito para ações explícitas (CTA, submit, confirmar, cancelar, remover, navegar por ação).
- `<button>` nativo `MAY` ser usado apenas dentro de primitives de interação dedicadas.
- `<Button>` `MUST` usar target default `h-11`; modo compacto (`h-9`) apenas em contextos densos e explícitos.
- Primárias `MUST` usar superfície de marca temática (`bg-brand-gradient` ou `bg-primary`) com `text-primary-foreground` e `border-0`.
- Secundárias (`outline`/`ghost`/`link`) `MUST` manter `rounded-xl`.
- Primitives recomendadas:
  - `IconActionButtonV3` para ações de ícone (normal/danger, `default|compact`)
  - `TextActionButtonV3` para ações textuais inline
  - `RowActionButtonV3` para linhas full-width clicáveis
  - `SelectableTileButtonV3` para opções tipo tile/template
  - `SeriesToggleButtonV3` para toggles de série em gráficos
  - `OverflowActionsSheetV3` para ações de overflow mobile (`...`) com lista de ações contextual

### Lists e Movimentos
- `MUST` priorizar lista full-width para conteúdo principal.
- `SHOULD` usar linhas compactas antes de novos cartões.
- `MUST` usar overlays apenas para preview/contexto rápido.
- históricos longos (`MUST`) abrir em ecrã full-screen dedicado (não em sheet expandido).

### Forms
- `MUST` manter ritmo vertical consistente.
- `MUST` evitar grupos com padding excessivo sem ganho de legibilidade.
- `MUST` reutilizar o mesmo padrão visual entre auth e perfil para inputs/selects:
  - label `text-sm` + campo `h-12`
  - `rounded-2xl`
  - `bg-surface-soft`
  - foco suave (`ring` sem borda pesada)

### Auth (Login/Registo)
- `MUST` usar topo/hero com superfície de marca do tema (gradiente ou sólido) e logo/nome centrados.
- `MUST` incluir separador curvo entre hero e corpo (`svg` estático, responsivo).
- `MUST` manter corpo flat (`bg-background`) sem card, borda ou sombra.
- `MUST` usar troca textual entre modos (login/registo), sem tabs.
- `SHOULD` manter patch notes discretas no fundo da viewport quando visíveis.

### Empty States
- `MUST` conter: mensagem curta + CTA + contexto mínimo.

## 5. Regras por Página

- páginas autenticadas `MUST` usar stack base `pageStack` (`flex flex-col gap-6 pb-6`).

### Month
- `MUST` ter topo contextual do mês + navegação mensal compacta.
- `MUST` ter um bloco único contínuo (`Month Financial Stack`) para leitura macro + categorias.
- `MUST` usar apenas uma barra global de progresso no topo do stack (sem duplicação).
- `MUST` listar categorias de despesa em linhas flat full-width, sem cards aninhados.
- `MUST` abrir detalhe de despesas por categoria em `bottom sheet` de preview.
- `MUST` oferecer navegação `Ver todas` para ecrã completo da categoria quando necessário.
- `MUST` mostrar receitas num bloco compacto separado abaixo das categorias.

### Stats
- `MUST` ter filtros de período compactos.
- `MUST` manter escopo por conta ativa no v1 (sem modo global implícito).
- `MUST` seguir padrão `Action-first + Storytelling` com 4 blocos:
  - `Pulse do período` (macro + insight acionável)
  - `Drivers` (top 3 categorias com maior impacto)
  - `Tendência` (gráfico principal único)
  - `Projeção` (3M/6M + confiança)
- `MUST` evitar grelhas KPI densas e painéis analíticos redundantes.
- `MUST` usar drilldown de categoria em `sheet` contextual (não inline expandido).
- `MUST` manter projeção com seletor `3M/6M` e nota de confiança.
  - o seletor de período e projeção `MUST` usar `SegmentedControlV3`.
- o report IA detalhado `MUST` viver em página dedicada (`/stats/insights`) e nao inline em `/stats`.
- abrir `/stats` `MUST NOT` disparar qualquer pedido de insight IA.

### Budget Editor
- `MUST` apresentar templates em lista compacta.
- `MUST` manter fluxo contínuo de edição (menos cartões intermédios).
- `MUST` evitar wrappers V2 (`SectionCardV2`, `ActionRailV2`) no fluxo principal.

### Profile
- `MUST` usar `hub + subpáginas`:
  - `/profile` como índice de secções (settings list flat)
  - `/profile/*` para detalhe dedicado de cada secção
- `MUST` evitar tabs na página de perfil.
- `MUST` manter ações de conta partilhada (`criar/join`) centralizadas em `/profile/shared`.
- `MUST` garantir touch targets mínimos de `44px` (`h-11`) em botões, selects e linhas acionáveis.
- `MUST` usar `Switch` para toggles de preferências (evitar checkbox raw).
- `MUST` aplicar política de CTA:
  - no máximo 1 CTA primária por subpágina
  - ações restantes em `outline`/`ghost`
- `MUST` estruturar `Conta partilhada` como:
  - hub: `/profile/shared`
  - subrotas: `/profile/shared/accounts`, `/profile/shared/create`, `/profile/shared/join`, `/profile/shared/members`
  - comportamento de voltar em `shared/*`: regressa para `/profile/shared`
- `SHOULD` reduzir padding e wrappers decorativos.
- CTAs principais em perfil `MUST` usar `rounded-xl`.

## 6. Clutter Budget (mensurável)

- Máximo de 1 CTA primária por viewport.
- Máximo de 3 blocos principais above-the-fold.
- Máximo de 1 segmented control ativo por secção funcional.

## 7. Definition of Done Visual

Uma alteração UI v3 só está pronta quando:
- spacing e radius seguem os contratos acima,
- densidade e alinhamento são consistentes entre ecrãs,
- não há ações mortas no topo,
- empty states críticos têm CTA,
- texto PT-PT está consistente,
- documentação de UI foi atualizada quando houver nova regra visual.

## 8. Theming (anti-drift)

- `theme.css` MUST conter apenas base semântica e zero cores literais.
- Cada tema MUST viver em `src/styles/themes/<id>.css` e cumprir `_template.css` (tokens `--t-*`).
- Tokens de gradiente (`--t-gradient-*` e `--t-category-gradient-*`) `MAY` existir por tema; quando ausentes, o runtime usa fallback sólido.
- O runtime MUST aplicar tema por `data-theme="<id>"`.
- Não é permitido usar variantes `dark:` no frontend.
- Qualquer nova regra visual de tema MUST atualizar:
  - `docs/frontend/design-tokens.md`
  - `docs/frontend/ui-v3-spec.md`
  - README(s) relevantes.

## 9. Checklist de PR (UI)

- [ ] Componentes/ecrãs seguem esta spec (`MUST`/`SHOULD`).
- [ ] Sem sombras fora de overlays/dialogs/sheets.
- [ ] `...` funcional em mobile via `OverflowActionsSheetV3`.
- [ ] Guardrail de interação (`ui-v3-contracts.test.ts`) passa com varrimento de `src/app/**/*.tsx`.
- [ ] `npm run check-theme-contract` e `npm run check:tokens` verdes.
- [ ] Testes de UI relevantes atualizados.
- [ ] README/docs com referências à spec atualizados.
