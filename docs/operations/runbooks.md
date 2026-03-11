# Runbooks e Troubleshooting

## Incidente: login falha para todos

Sintomas:
- `401` em `/auth/login` para credenciais validas
- ou erros de assinatura JWT apos login

Checklist:
1. confirmar secrets JWT no backend
2. confirmar `NODE_ENV` correto
3. validar hora do servidor (clock skew)
4. verificar logs de erro do backend

Mitigacao:
- reverter deploy backend
- invalidar sessoes se segredo mudou

## Incidente: user sem conta pessoal/membership

Sintomas:
- dropdown de contas vazio
- `ACCOUNT_ACCESS_DENIED` inesperado

Checklist:
1. validar `users.personalAccountId`
2. validar membership `(accountId,userId)` ativa owner
3. correr migracao

Comando:
```bash
cd backend
npm run migrate:accounts
```

## Incidente: duplicacao visual de contas no frontend

Possivel causa:
- legado com memberships duplicados para a mesma conta

Situacao atual no codigo:
- `listUserAccounts` deduplica por `accountId`
- escolhe role com precedencia `owner > editor > viewer`
- ignora memberships orfaos (conta inexistente)

Acao recomendada:
- limpar duplicados na BD e manter indices unicos.

## Incidente: nao consegue criar lancamento manual

Erro:
- `BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS`

Causa:
- budget do mes nao esta pronto (`isReady=false`)

Resolucao:
1. abrir editor de budget
2. garantir categorias somam 100%
3. guardar

## Incidente: stats vazias ou incoerentes

Checklist:
1. confirmar `X-Account-Id` correto
2. validar existencia de transacoes no periodo
3. validar budgets com categorias e incomes
4. testar endpoints manualmente:
   - `/stats/semester`
   - `/stats/year`

## Operacao de manutencao

Para mostrar ecran de manutencao no frontend:
- `VITE_MAINTENANCE_MODE=true`
- opcionalmente ajustar titulo/mensagem

Nao interrompe backend/API; apenas altera UI frontend.

## Checklist de smoke test apos deploy

1. Registar novo user
2. Confirmar criacao de conta pessoal
3. Criar conta partilhada
4. Entrar por codigo com segundo user
5. Validar role permissions (viewer sem escrita)
6. Criar budget 100%
7. Criar income manual e validar `totalBudget`
8. Abrir stats e validar trend/budgetVsActual
9. Validar tutorial auto apenas para user sem `tutorialSeenAt`

