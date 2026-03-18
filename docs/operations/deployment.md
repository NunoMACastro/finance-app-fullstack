# Deployment

## Topologia recomendada

- Frontend: Vercel
- Backend: Render/Fly/railway/outro runtime Node
- DB: MongoDB Atlas

## Variaveis obrigatorias

### Backend (producao)

Obrigatorias:
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`

Recomendadas:
- `NODE_ENV=production`
- `PORT`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `RATE_LIMIT_*`
- `CRON_ENABLED=true`
- `TIMEZONE=Europe/Lisbon`
- `OPENAI_API_KEY` (opcional; ativa insight IA em stats)
- `OPENAI_INSIGHT_MODEL` (opcional; default economico)
- `OPENAI_INSIGHT_TIMEOUT_MS` (opcional; timeout curto para nao bloquear UX)
- `OPENAI_INSIGHT_CACHE_TTL_SECONDS` (opcional; cache em memoria para custo/latencia)

Restricoes:
- `CORS_ORIGIN` nao pode ser `*` em producao.

### Frontend

- `VITE_API_BASE_URL=https://<backend-domain>/api/v1`
- `VITE_MAINTENANCE_MODE=false` (ou `true` para janela de manutencao)
- `VITE_MAINTENANCE_TITLE`
- `VITE_MAINTENANCE_MESSAGE`

## Ordem de deploy recomendada

1. Deploy backend
2. Validar `/health` e `/ready`
3. Executar migracao de contas se necessario
4. Deploy frontend
5. Smoke test:
   - login
   - troca de conta
   - month fetch
   - stats fetch

## Migracoes

Quando houver legado sem conta pessoal/membership:

```bash
cd backend
npm run migrate:accounts
```

Executar antes de abrir trafego de escrita.

## Rollback

- Backend:
  - manter versao anterior pronta
  - rollback rapido se erros 5xx ou auth regressions
- Frontend:
  - reverter release no provider (Vercel)
- DB:
  - backups Atlas antes de mudancas estruturais
