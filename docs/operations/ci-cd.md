# CI/CD

Pipeline atual: `.github/workflows/ci.yml`

## Triggers

- `push` em qualquer branch
- `pull_request`

## Job backend

Diretorio: `backend`

Passos:
1. checkout
2. setup Node 22
3. `npm ci`
4. `npm run build`
5. `npm run test:unit`
6. `npm run test:integration`

## Job frontend

Diretorio: `frontend`

Passos:
1. checkout
2. setup Node 22
3. `npm ci`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run check-theme-contract`
7. `npm run check:tokens`
8. `npm run test`
9. `npm run build`

Nota:
- `npm run lint` ja executa `check-theme-contract` e `check:tokens`.
- os passos 6 e 7 mantem guardrails explicitos no workflow.
- `npm run test:e2e` (Playwright) esta disponivel para execucao local/manual e nao corre por defeito na CI desta vaga.

## Politica recomendada de branch

- PR obrigatoria para main
- merge condicionado a CI verde
- sem bypass para testes falhados

## Melhorias futuras (sugestao)

- adicionar cobertura de testes (threshold)
- adicionar changelog automatizado
- adicionar deploy preview por PR
- adicionar scan de dependencias/supply chain
