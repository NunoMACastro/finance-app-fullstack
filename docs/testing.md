# Guia Unico de Testes

Este guia centraliza a execucao de **todos os testes disponiveis** (backend, frontend e E2E).

## Pre-requisitos

- Node.js 20+
- npm 10+
- Dependencias instaladas em `backend/` e `frontend/`
- MongoDB disponivel para testes de backend (integration usa MongoMemoryServer)

Setup rapido:

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

## Ordem recomendada (rapida)

```bash
cd frontend
npm run typecheck
npm run lint
npm run test

cd ../backend
npm run build
npm run test:unit
```

## Ordem recomendada (completa)

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build

cd ../backend
npm run build
npm run test:unit
npm run test:integration
```

## Backend (Vitest + Supertest)

Diretorio: `backend/`

```bash
npm run test:unit
npm run test:integration
npm run test
```

Notas:
- `test:integration` usa `vitest.integration.config.ts` e `src/tests/integration/harness.ts`.
- Se falhar com erro de portas (`EPERM`/`listen`) em ambiente restrito, executa fora do sandbox/containers restritos.

## Frontend (Vitest + Testing Library)

Diretorio: `frontend/`

```bash
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
npm run build
```

## E2E (Playwright) — local/manual

Diretorio: `frontend/`

Instalacao inicial de browsers:

```bash
npx playwright install
```

Execucao:

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Notas:
- E2E usa `playwright.config.ts`.
- Por default sobe o frontend em `http://127.0.0.1:4173`.
- Podes sobrepor base URL:

```bash
E2E_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```

## Execucao parcial por ficheiro/suite

Frontend (Vitest):

```bash
cd frontend
npm run test -- src/app/lib/theme-palette.test.ts
```

Backend unit:

```bash
cd backend
npm run test:unit -- src/tests/unit/auth-validators.test.ts
```

Backend integration:

```bash
cd backend
npx vitest run -c vitest.integration.config.ts src/tests/integration/profile-flow.test.ts
```

E2E:

```bash
cd frontend
npm run test:e2e -- e2e/smoke.spec.ts
```

## Troubleshooting rapido

- `MongoMemoryServer` falha a arrancar:
  - validar permissao de bind de portas locais,
  - validar disponibilidade de `127.0.0.1`.
- Vitest frontend com erro de ambiente:
  - confirmar `jsdom` instalado,
  - limpar cache (`rm -rf node_modules/.vite`).
- Playwright sem browser:
  - correr `npx playwright install`.
