# Finance v2 (Pouperrimo)

Aplicacao de gestao financeira pessoal e partilhada (familia/household), com backend Node.js + MongoDB e frontend React.

## O que o produto faz

- Conta pessoal por utilizador (obrigatoria)
- Contas partilhadas com membros e roles (`owner`, `editor`, `viewer`)
- Orcamento mensal por categorias, com templates
- Bloqueio de lancamentos manuais sem orcamento mensal valido
- `totalBudget` sempre derivado das receitas do mes
- Lancamentos recorrentes
- Dashboard mensal (Month) e analitica (Stats)
- Tutorial guiado por pagina (Month/Stats)

## Stack

### Backend

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Zod
- JWT access/refresh
- node-cron

### Frontend

- React 18 + TypeScript
- Vite
- React Router
- Axios
- Motion

## Estrutura do repositorio

- `backend/` API e regras de negocio
- `frontend/` aplicacao web (mobile-first)
- `docs/` documentacao tecnica detalhada
- `.github/workflows/ci.yml` pipeline CI

## Documentacao detalhada

Comeca aqui: [`docs/README.md`](./docs/README.md)

Atalhos importantes:

- Arquitetura: [`docs/architecture/system-overview.md`](./docs/architecture/system-overview.md)
- API: [`docs/backend/api-reference.md`](./docs/backend/api-reference.md)
- Frontend estado/API: [`docs/frontend/state-and-api.md`](./docs/frontend/state-and-api.md)
- Frontend theming/tokens: [`docs/frontend/design-tokens.md`](./docs/frontend/design-tokens.md)
- Frontend UI v3: [`docs/frontend/ui-v3-spec.md`](./docs/frontend/ui-v3-spec.md)
- Deploy: [`docs/operations/deployment.md`](./docs/operations/deployment.md)

## Requisitos

- Node.js 20+
- npm 10+
- MongoDB local ou Atlas

## Como correr localmente

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend em `http://localhost:3001`.

### 2) Frontend

```bash
cd frontend
npm install
```

Criar `frontend/.env`:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_MAINTENANCE_MODE=false
```

Arrancar:

```bash
npm run dev
```

Frontend em `http://localhost:5173`.

## Scripts principais

### Backend

```bash
cd backend
npm run dev
npm run build
npm run start
npm run migrate:accounts
npm run test
```

### Frontend

```bash
cd frontend
npm run dev
npm run typecheck
npm run check-theme-contract
npm run check:tokens
npm run lint
npm run test
npm run build
```

## Variaveis de ambiente criticas

### Backend (producao)

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (nao pode ser `*` em producao)

### Frontend

- `VITE_USE_MOCK=false`
- `VITE_API_BASE_URL=https://<backend>/api/v1`
- `VITE_MAINTENANCE_MODE`

## CI

Workflow GitHub Actions (`.github/workflows/ci.yml`):

- backend: build + unit + integration
- frontend: typecheck + lint + tests + build

## Notas operacionais

- Se existirem dados legados sem `personalAccountId`/membership, correr:

```bash
cd backend
npm run migrate:accounts
```

- Endpoints de monitorizacao:
    - `GET /health`
    - `GET /ready`
    - `GET /metrics`

## Seguranca

- Nao commitar `.env` com segredos.
- Rodar secrets JWT em producao de forma controlada.
- Rever CORS antes de abrir trafego publico.
