# Frontend Setup e Configuracao

## Requisitos

- Node.js 20+
- npm 10+
- Backend API disponivel (ou modo mock)

## Setup local

```bash
cd frontend
npm install
npm run dev
```

Dev server default: `http://localhost:5173`

## Variaveis de ambiente

Lidas em `src/app/lib/config.ts`.

- `VITE_USE_MOCK`
  - `false` por default
  - `true` ativa dados simulados em `app/lib/api.ts`
- `VITE_UI_VERSION`
  - `v1` por default
  - `v2` ativa o layout V2 (shell/paginas migradas)
  - override para QA: `?ui=v1` ou `?ui=v2` (persistido em `sessionStorage`)
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
VITE_USE_MOCK=false
VITE_UI_VERSION=v1
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
npm run lint
npm run test
npm run test:watch
```

## Integracao com backend

Para funcionar com API real:
- backend deve aceitar CORS da origem do frontend,
- backend deve estar com `NODE_ENV` e secrets corretos,
- frontend deve enviar tokens e `X-Account-Id` automaticamente (feito via `http-client.ts`).

## Notas de deploy

- Em Vercel, configurar todas as variaveis no painel do projeto.
- Rebuild necessario apos alterar vars.
- Nunca expor segredos backend no frontend.
