# Backend Setup e Configuracao

## Requisitos

- Node.js 20+
- npm 10+
- MongoDB local ou Atlas

## Setup local

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Servidor local default: `http://localhost:3001`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run seed
npm run migrate:accounts
npm run test:unit
npm run test:integration
npm run test
```

## Variaveis de ambiente

Definidas em `src/config/env.ts`.

- `NODE_ENV`: `development|test|production`
- `PORT`: porta HTTP
- `MONGODB_URI`: string de conexao Mongo
- `JWT_ACCESS_SECRET`: segredo token access
- `JWT_REFRESH_SECRET`: segredo token refresh
- `ACCESS_TOKEN_TTL_MINUTES`: expiracao access token
- `REFRESH_TOKEN_TTL_DAYS`: expiracao refresh token
- `CORS_ORIGIN`: origem permitida (lista CSV ou `*`)
- `RATE_LIMIT_WINDOW_MS`: janela rate limit global
- `RATE_LIMIT_MAX`: max pedidos por janela
- `AUTH_RATE_LIMIT_MAX`: max pedidos auth por janela
- `OPENAI_API_KEY`: chave OpenAI (opcional, usada para enriquecer stats com insight IA)
- `OPENAI_INSIGHT_MODEL`: modelo OpenAI para insight de stats (default `gpt-4.1-mini`)
- `OPENAI_INSIGHT_TIMEOUT_MS`: timeout da chamada OpenAI em ms (default `2500`)
- `OPENAI_INSIGHT_CACHE_TTL_SECONDS`: TTL do cache em memoria para insights IA (default `300`)
- `CRON_ENABLED`: ativa scheduler
- `TIMEZONE`: timezone cron (ex: `Europe/Lisbon`)

## Regras de hardening em producao

Em `NODE_ENV=production`:
- `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` sao obrigatorias.
- `CORS_ORIGIN="*"` e proibido.

## Endpoints de estado

- `GET /health`
  - retorna `200 { status: "ok" }`
- `GET /ready`
  - retorna `200 { status: "ready" }` se DB ligada
  - retorna `503 { status: "not_ready" }` caso contrario
- `GET /metrics`
  - texto Prometheus

## Notas de seguranca

- URI Mongo e sanitizada em logs (`***@`) para nao expor credenciais.
- Nunca commitar `.env` com segredos.
