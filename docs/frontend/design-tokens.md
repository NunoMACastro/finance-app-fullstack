# Design Tokens (Theme v3)

## Objetivo

A UI usa apenas tokens semanticos.
Nao e permitido usar:
- paletas diretas (`sky-*`, `red-*`, `slate-*`, etc.),
- cores literais (`#`, `rgb`, `hsl`) fora de `src/styles/themes/*.css`,
- variantes `dark:` em `src/`.

## Arquitetura oficial

### 1) Base sem cores
- Ficheiro: `frontend/src/styles/theme.css`
- Papel: contrato semantico + utilitarios semanticos + `@theme inline`.
- Regra: `theme.css` MUST ter zero cores literais.

### 2) Um ficheiro por tema
- Diretoria: `frontend/src/styles/themes/`
- Ficheiros runtime:
  - `amber.css`
  - `ciano.css`
  - `brisa.css`
  - `calma.css`
  - `mare.css`
  - `aurora.css`
  - `terra.css`
- Template de contrato:
  - `_template.css`
- Regra: cada tema MUST definir exatamente o conjunto `--t-*` do template.

### 3) Ativacao de tema
- O tema ativo e aplicado com `data-theme="<id>"` no `documentElement`.
- IDs suportados: `brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`.
- Nao existe estado funcional separado de dark/light.

## Contrato de tokens

- Prefixo obrigatorio: `--t-*` nos ficheiros de tema.
- `theme.css` mapeia `--t-*` para tokens semanticos publicos (`--background`, `--foreground`, etc.).
- Componentes devem consumir apenas tokens semanticos/classes semanticas.
- Cores de categoria usam slots semanticos `1..9`:
  - base: `--t-category-1..9`
  - derivados: `--t-category-gradient-*`, `--t-category-soft-*`, `--t-category-text-*`
  - binding funcional: `BudgetCategory.colorSlot` (API) -> classes `bg-category-*` / `text-category-*`.

## Guardrails automaticos

- `npm run check-theme-contract`
  - valida contrato do template em todos os temas,
  - falha se houver tokens em falta ou extra,
  - falha se existir `dark:` em `src/`.
- `npm run check:tokens`
  - falha se existirem cores hardcoded fora dos ficheiros de tema.

## Do / Don't

- Do:
  - adicionar novo token primeiro em `_template.css` e em todos os temas,
  - mapear o novo token em `theme.css` quando for semantico publico,
  - manter aliases legados normalizados para IDs atuais no provider.
- Don't:
  - criar estilos de cor inline em JSX,
  - introduzir `dark:`,
  - editar apenas um tema quando o contrato mudar.
