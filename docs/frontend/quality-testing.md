# Frontend Qualidade, Testes e Build

Guia central de execucao (backend + frontend + E2E): [`../testing.md`](../testing.md)

## Scripts de qualidade

```bash
cd frontend
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
npm run test:e2e
npm run build
```

Nota:
- `npm run lint` ja executa `check-theme-contract` e `check:tokens`.
- na CI os guardrails tambem correm explicitamente como passos dedicados.

## Tooling

- TypeScript (`tsc --noEmit`)
- Theme contract guardrail (`scripts/check-theme-contract.mjs`)
- Token guardrail (`scripts/check-tokens.mjs`)
- ESLint (`@typescript-eslint`, hooks, react-refresh)
- Vitest + Testing Library + jsdom
- Playwright (E2E local/manual)

## Configuracao de testes

Arquivo: `vitest.config.ts`
- ambiente: `jsdom`
- globals: `true`
- setup: `src/test/setup.ts`

## Testes existentes

Inventario rapido:

```bash
rg --files src | rg "\\.test\\.(ts|tsx)$" | sort
```

Suites atuais (resumo por area):
- auth/session: `auth-page.test.tsx`, `login-patch-notes.test.ts`
- account/layout: `layout.account-select.test.tsx`
- month e movimentos: `month-page.financial-ruler.test.tsx`, `month-financial-ruler.test.tsx`, `month-expense-category-row.test.tsx`, `category-expenses-sheet.test.tsx`, `category-movements-page.test.tsx`
- recorrencias: `recurring-rules-page.test.tsx`
- stats/ui v3: `stats-page.test.tsx`, `stats-view-model.test.ts`, `ui-v3-structure.test.tsx`, `ui-v3-contracts.test.ts`, `v3/page-header-v3.test.tsx`, `v3/segmented-control-v3.test.tsx`, `v3/bottom-nav-v3.test.tsx`
- interactions v3: `v3/interaction-primitives-v3.test.tsx`, `v3/overflow-actions-sheet-v3.test.tsx`
- dialogos e overlays: `confirm-action-dialog.test.tsx`, `responsive-overlay.test.tsx`
- onboarding/manutencao/mobile: `tutorial-tour.test.tsx`, `maintenance-page.test.tsx`
- estado/lib: `theme-preferences.test.tsx`, `category-color-slot.test.ts`, `category-kind.test.ts`
- estado/lib (theming): `theme-preferences.test.tsx`, `theme-palette.test.ts`, `theme-palette.contract.test.ts`
- bootstrap app: `main.test.ts`
- contract guardrail: `theme-contract.test.ts`

## CI

Na pipeline principal:
- install
- typecheck
- lint
- check-theme-contract
- check:tokens
- tests
- build

E2E:
- não corre em PR por defeito nesta vaga;
- execução manual/local via `npm run test:e2e`.

Falha em qualquer etapa bloqueia merge.

## Performance de bundle

`vite.config.ts` inclui:
- code-splitting por `manualChunks`
- limite de aviso de chunk: `350KB`

Recomendacoes continuas:
- manter rotas lazy
- evitar imports pesados em `layout`
- auditar dependencias nao usadas periodicamente

## Checklist de PR frontend

- [ ] sem regressao em login/session refresh
- [ ] troca de conta ativa funciona (header + dados)
- [ ] month page respeita bloqueio sem budget valido
- [ ] stats page lida com erro e retry
- [ ] contratos visuais UI v3 passam (`ui-v3-contracts.test.ts`)
- [ ] contratos de interação passam (sem `<button>` direto fora de primitives no escopo `src/app/**/*.tsx` e radius de botões normalizado)
- [ ] tutorial continua por escopo e sem jump visual
- [ ] typecheck/lint/test/build verdes
