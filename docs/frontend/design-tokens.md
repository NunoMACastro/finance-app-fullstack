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
- Regra: cada tema MUST definir o conjunto obrigatório `--t-*` do template.
- Extensão opcional: gradientes por tema (`--t-gradient-*`, `--t-category-gradient-*`).

### 3) Ativacao de tema
- O tema ativo e aplicado com `data-theme="<id>"` no `documentElement`.
- IDs suportados: `brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`.
- Nao existe estado funcional separado de dark/light.

## Contrato de tokens

- Prefixo obrigatorio: `--t-*` nos ficheiros de tema.
- `theme.css` mapeia `--t-*` para tokens semanticos publicos (`--background`, `--foreground`, etc.).
- Componentes devem consumir apenas tokens semanticos/classes semanticas.
- Tokens de gradiente sao opcionais por tema; quando ausentes, o runtime aplica fallback semantico sólido.
- Cores de categoria usam slots semanticos `1..9`:
  - base: `--t-category-1..9`
  - derivados obrigatorios: `--t-category-soft-*`, `--t-category-text-*`
  - derivados opcionais: `--t-category-gradient-*`
  - binding funcional: `BudgetCategory.colorSlot` (API) -> classes `bg-category-*` / `text-category-*`.

## Guardrails automaticos

- `npm run check-theme-contract`
  - valida tokens obrigatorios do template em todos os temas,
  - aceita tokens opcionais de gradiente conhecidos,
  - falha se houver tokens obrigatorios em falta ou tokens desconhecidos,
  - falha se existir `dark:` em `src/`.
- `npm run check:tokens`
  - falha se existirem cores hardcoded fora dos ficheiros de tema.
  - cobre todo o `src/` com extensões suportadas; `src/imports/` não tem exceção estrutural.

## Do / Don't

- Do:
  - adicionar novo token obrigatorio primeiro em `_template.css` e em todos os temas,
  - para gradientes opcionais, definir apenas nos temas que precisarem,
  - mapear o novo token em `theme.css` quando for semantico publico,
  - manter aliases legados normalizados para IDs atuais no provider.
- Don't:
  - criar estilos de cor inline em JSX,
  - introduzir `dark:`,
  - editar apenas um tema quando o contrato mudar.
