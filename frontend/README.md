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
- `src/styles/themes/*.css`: um ficheiro por tema (`brisa`, `calma`, `aurora`, `terra`).
- `src/styles/themes/_template.css`: contrato obrigatorio `--t-*`.
- Guardrails:
  - `npm run check-theme-contract`
  - `npm run check:tokens`

## Quick start

```bash
cd frontend
npm install
npm run dev
```

## Config minima (`.env`)

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_MAINTENANCE_MODE=false
```
