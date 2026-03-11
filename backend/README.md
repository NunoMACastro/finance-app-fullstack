# Finance v2 Backend

Backend API em Node.js + Express + MongoDB para o projeto Finance v2.

## Requisitos
- Node.js 20+
- MongoDB (local ou Atlas)

## Setup
1. Copiar env:
   - `cp .env.example .env`
2. Instalar dependencias:
   - `npm install`
3. Arrancar em dev:
   - `npm run dev`

Servidor por defeito: `http://localhost:3001`

## Endpoints principais
- Health: `GET /health`
- Ready: `GET /ready`
- Metrics: `GET /metrics`
- API base: `/api/v1`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Transactions
- `GET /api/v1/transactions?month=YYYY-MM`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/:id`
- `DELETE /api/v1/transactions/:id`

### Budgets
- `GET /api/v1/budgets/:month`
- `PUT /api/v1/budgets/:month`
- `POST /api/v1/budgets/:month/categories`
- `DELETE /api/v1/budgets/:month/categories/:categoryId`
- `POST /api/v1/budgets/:month/copy-from/:sourceMonth`

### Stats
- `GET /api/v1/stats/semester?endingMonth=YYYY-MM`
- `GET /api/v1/stats/year?year=YYYY`
- `GET /api/v1/stats/compare-budget?from=YYYY-MM&to=YYYY-MM`

### Recurring Rules
- `GET /api/v1/recurring-rules`
- `POST /api/v1/recurring-rules`
- `PUT /api/v1/recurring-rules/:id`
- `DELETE /api/v1/recurring-rules/:id`
- `POST /api/v1/recurring-rules/generate?month=YYYY-MM`

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
