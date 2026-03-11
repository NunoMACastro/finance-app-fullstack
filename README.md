# Finance v2

Monorepo para uma aplicacao de controlo financeiro com:

- `frontend/`: app React + Vite
- `backend/`: API Node.js + Express + MongoDB

## Estrutura

- `frontend/` -> interface e consumo da API
- `backend/` -> auth, transacoes, budgets, stats e recurring rules
- `BACKEND_PLAN.md` -> plano de implementacao do backend

## Requisitos

- Node.js 20+
- npm
- MongoDB local ou Atlas

## Setup Local

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend por defeito em `http://localhost:3001`.

Health checks:

- `GET /health`
- `GET /ready`

### 2) Frontend

```bash
cd frontend
npm install
```

Criar `frontend/.env`:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

Iniciar:

```bash
npm run dev
```

Frontend por defeito em `http://localhost:5173`.

## Scripts Principais

### Backend

```bash
cd backend
npm run dev
npm run build
npm run test
npm run start
```

Notas de testes:

- Testes unitarios correm por defeito.
- Integracao com `mongodb-memory-server` pode ser ativada com `RUN_INTEGRATION=true`.

### Frontend

```bash
cd frontend
npm run dev
npm run build
```

## Deploy (recomendado)

- Frontend: Vercel (root directory `frontend`)
- Backend: Render (root directory `backend`)
- Base de dados: MongoDB Atlas

Variaveis minimas de producao:

- Backend: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`
- Frontend: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=https://<backend>/api/v1`

## Notas

- O projeto esta organizado como monorepo para manter frontend e backend alinhados.
- Evitar commitar ficheiros `.env` com segredos.
