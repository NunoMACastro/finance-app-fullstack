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
- Exceções de radius (`MAY`): overlays/sheets/dialogs até `20px`, com justificação funcional.
- Elevação (`MUST`): `0` por defeito; sombra apenas para overlays/dialogs/sheets.
- Touch targets (`MUST`): mínimo equivalente a `44px`.

## 3. Shell Global v3

- O runtime `MUST` usar:
  - `AppShellV3`
  - `TopBarV3`
  - `BottomNavV3`
  - `OverflowActionsSheetV3`
- `TopBarV3` `MUST` ter 2 linhas:
  - Linha principal: produto + privacidade + overflow.
  - Linha contexto: conta + tutorial + perfil.
- Overflow `...` em mobile `MUST` abrir `bottom sheet`.
- Desktop/tablet `MAY` usar dropdown para overflow, com as mesmas labels/ações do mobile.

## 4. Regras por Componente

### Header / Top Bar
- `MUST` ser funcional e compacto (sem caixa decorativa gigante).
- `MUST` manter `aria-label` em botões de ícone.

### Bottom Navigation
- Estado ativo `MUST` ser claro mas discreto (cor + marcador), sem bloco pesado.

### Cards/Sections
- `SHOULD` privilegiar superfícies simples com borda sem sombras de cartão.
- `MUST` evitar card dentro de card sem necessidade funcional.

### Lists e Movimentos
- `MUST` priorizar lista full-width para conteúdo principal.
- `SHOULD` usar linhas compactas antes de novos cartões.

### Forms
- `MUST` manter ritmo vertical consistente.
- `MUST` evitar grupos com padding excessivo sem ganho de legibilidade.

### Auth (Login/Registo)
- `MUST` usar topo/hero com gradiente do tema e logo/nome centrados.
- `MUST` incluir separador curvo entre hero e corpo (`svg` estático, responsivo).
- `MUST` manter corpo flat (`bg-background`) sem card, borda ou sombra.
- `MUST` usar troca textual entre modos (login/registo), sem tabs.
- `SHOULD` manter patch notes discretas no fundo da viewport quando visíveis.

### Empty States
- `MUST` conter: mensagem curta + CTA + contexto mínimo.

## 5. Regras por Página

### Month
- `MUST` ter topo contextual do mês + navegação mensal compacta.
- `MUST` ter um bloco único contínuo (`Month Financial Stack`) para leitura macro + categorias.
- `MUST` usar apenas uma barra global de progresso no topo do stack (sem duplicação).
- `MUST` listar categorias de despesa em linhas flat full-width, sem cards aninhados.
- `MUST` abrir detalhe de despesas por categoria em `bottom sheet` (tap na linha).
- `MUST` mostrar receitas num bloco compacto separado abaixo das categorias.

### Stats
- `MUST` ter filtros de período compactos.
- `SHOULD` usar blocos analíticos full-width com baixa ornamentação.
- `MUST` manter projeção com seletor `3M/6M` e nota de confiança.

### Budget Editor
- `MUST` apresentar templates em lista compacta.
- `MUST` manter fluxo contínuo de edição (menos cartões intermédios).

### Profile
- `MUST` seguir padrão “settings list” por secções.
- `SHOULD` reduzir padding e wrappers decorativos.

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
- [ ] `npm run check-theme-contract` e `npm run check:tokens` verdes.
- [ ] Testes de UI relevantes atualizados.
- [ ] README/docs com referências à spec atualizados.
