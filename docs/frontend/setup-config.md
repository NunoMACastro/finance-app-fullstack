# Frontend Setup e Configuracao

## Requisitos

- Node.js 20+
- npm 10+
- Backend API disponivel

## Setup local

```bash
cd frontend
npm install
npm run dev
```

Dev server default: `http://localhost:5173`

## Variaveis de ambiente

Lidas em `src/app/lib/config.ts`.

Nota: a app corre apenas em `UI v3` (os fallbacks antigos foram removidos).
As regras de estrutura visual e coerencia estao em `docs/frontend/ui-v3-spec.md`.

- `VITE_API_BASE_URL`
  - default `/api/v1`
  - local recomendado: `http://localhost:3001/api/v1`
- `VITE_MAINTENANCE_MODE`
  - `true` mostra ecran de manutencao
- `VITE_MAINTENANCE_TITLE`
  - titulo opcional do ecran de manutencao
- `VITE_MAINTENANCE_MESSAGE`
  - mensagem opcional do ecran de manutencao

Exemplo `.env`:

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_MAINTENANCE_MODE=false
VITE_MAINTENANCE_TITLE=Estamos em manutencao
VITE_MAINTENANCE_MESSAGE=Voltamos em breve. Obrigado pela paciencia.
```

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
npm run test:watch
npm run test:e2e
```

## Integracao com backend

Para funcionar com API real:
- backend deve aceitar CORS da origem do frontend,
- backend deve estar com `NODE_ENV` e secrets corretos,
- frontend deve enviar tokens e `X-Account-Id` automaticamente apenas nos requests account-scoped (feito via `http-client.ts`).

## Notas de deploy

- Em Vercel, configurar todas as variaveis no painel do projeto.
- Rebuild necessario apos alterar vars.
- Nunca expor segredos backend no frontend.
