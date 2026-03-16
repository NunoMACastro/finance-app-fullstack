# Frontend Qualidade, Testes e Build

## Scripts de qualidade

```bash
cd frontend
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
npm run build
```

## Tooling

- TypeScript (`tsc --noEmit`)
- Theme contract guardrail (`scripts/check-theme-contract.mjs`)
- Token guardrail (`scripts/check-tokens.mjs`)
- ESLint (`@typescript-eslint`, hooks, react-refresh)
- Vitest + Testing Library + jsdom

## Configuracao de testes

Arquivo: `vitest.config.ts`
- ambiente: `jsdom`
- globals: `true`
- setup: `src/test/setup.ts`

## Testes existentes

- `maintenance-page.test.tsx`
  - valida render de titulo/mensagem do ecran de manutencao
- `mobile-only-screen.test.tsx`
  - valida copy de aviso mobile
- `confirm-action-dialog.test.tsx`
  - valida confirmacao forte para acoes destrutivas
- `responsive-overlay.test.tsx`
  - valida comportamento de overlay responsivo
- `login-patch-notes.test.ts`
  - valida parsing/enablement das patch notes de login

## CI

Na pipeline principal:
- install
- typecheck
- check:tokens
- check-theme-contract
- lint
- tests
- build

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
- [ ] tutorial continua por escopo e sem jump visual
- [ ] typecheck/lint/test/build verdes
