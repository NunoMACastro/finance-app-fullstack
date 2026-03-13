# Design Tokens (Semântico Puro)

## Objetivo

A UI deve usar **apenas tokens semânticos**.  
Não é permitido usar paletas diretas (`sky-*`, `red-*`, `slate-*`, etc.) nem cores literais (`#`, `rgb`, `hsl`) fora de `theme.css`.

## Fonte única de verdade

- Ficheiro: `frontend/src/styles/theme.css`
- Camadas:
  - **Core tokens**: palette/base internos (`--core-*`)
  - **Semantic tokens**: superfície, texto, estado, foco (`--background`, `--success`, etc.)
  - **Dimension tokens**: radius, spacing, shadows (`--dim-*`)
  - **Utilities semânticas**: gradientes e estados (`.bg-brand-gradient`, `.text-status-success`, etc.)

## Paletas de tema

- A paleta ativa e aplicada com `data-theme-palette` no `documentElement`.
- Opcoes suportadas:
  - `brisa` (default)
  - `calma`
  - `aurora`
  - `terra`
- Cada paleta altera apenas `--core-brand-1..4`; os tokens semanticos continuam a ser a API publica de estilo.

## Convenções

- Preferir classes semânticas Tailwind:
  - `bg-card`, `text-foreground`, `border-border`, `text-status-success`, `bg-warning-soft`
- Para gradientes e superfícies especiais:
  - `bg-page-gradient`, `bg-brand-gradient`, `bg-info-gradient`
- Para categorias:
  - `bg-category-gradient-*`, `bg-category-solid-*`, `bg-category-soft-*`, `text-category-*`

## Estados e feedback

- Sucesso: `text-status-success`, `bg-success-soft`
- Aviso: `text-status-warning`, `bg-warning-soft`
- Erro: `text-status-danger`, `bg-danger-soft`
- Informação: `text-status-info`, `bg-info-soft`

## Do / Don’t

- Do:
  - adicionar novo token em `theme.css` quando faltar uma intenção semântica.
  - reutilizar utilitários existentes antes de criar novos.
  - manter paridade visual com o estilo atual.
- Don’t:
  - usar classes tipo `text-sky-500`, `bg-rose-50`, `border-slate-200`.
  - usar `#hex`, `rgb(...)`, `hsl(...)` em componentes.
  - introduzir estilos inline de cor em JSX.

## Guardrail automático

- Script: `frontend/scripts/check-tokens.mjs`
- Comando: `npm run check:tokens`
- CI: executado no workflow de frontend.

O script falha se encontrar:
- utilitários de cor hardcoded,
- cores literais fora de `theme.css`.

## Evolução de tokens (playbook)

1. Definir token novo em `theme.css` (core + semantic se necessário).
2. Expor via `@theme inline` e/ou utilitário semântico.
3. Migrar uso no componente.
4. Executar `npm run lint` e `npm run check:tokens`.
5. Atualizar esta documentação se o padrão mudar.
