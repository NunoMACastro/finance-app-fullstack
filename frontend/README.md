# Pouperrimo Frontend

Este README e um atalho rapido. A documentacao detalhada do frontend esta em:

- `../docs/frontend/README.md`
- `../docs/frontend/setup-config.md`
- `../docs/frontend/architecture.md`
- `../docs/frontend/design-tokens.md`
- `../docs/frontend/ui-v3-spec.md`
- `../docs/frontend/screens-flows.md`
- `../docs/frontend/state-and-api.md`
- `../docs/frontend/quality-testing.md`

## Theming v3

- `src/styles/theme.css`: base semantica (sem cores literais).
- `src/styles/themes/*.css`: um ficheiro por tema (`brisa`, `calma`, `aurora`, `terra`, `mare`, `amber`, `ciano`).
- `src/styles/themes/_template.css`: contrato obrigatorio `--t-*` (gradientes sao extensao opcional por tema).
- Guardrails:
  - `npm run check-theme-contract`
  - `npm run check:tokens`

## Status pages

- `src/app/components/status-page.tsx`: base partilhada para `404/403/500/503`.
- `src/app/routes.ts`: catch-all `*` para `404` e `errorElement` do root route para `500`.
- `src/app/components/maintenance-page.tsx`: `503` de manutencao alinhado com o mesmo sistema visual.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

## Config minima (`.env`)

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_MAINTENANCE_MODE=false
```

Nao existe modo mock no fluxo oficial do frontend; a app consome a API real.
