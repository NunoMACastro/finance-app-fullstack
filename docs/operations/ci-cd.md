# CI/CD

Pipeline atual: `.github/workflows/ci.yml`

## Triggers

- `push` em qualquer branch
- `pull_request`

## Jobs adicionais

- `secret-scan`
  - corre `gitleaks` em cada push/PR
- auditoria de dependencias em backend/frontend
  - `npm audit --audit-level=high`
- verificação de provenance/signatures
  - `npm audit signatures` em backend/frontend
- SAST
  - `sast-semgrep` (OWASP Top Ten + Node.js + TypeScript)
  - `sast-codeql` (GitHub CodeQL para JavaScript/TypeScript)

## Job backend

Diretorio: `backend`

Passos:
1. checkout
2. setup Node 22
3. `npm ci`
4. `npm audit signatures`
5. `npm audit --audit-level=high`
6. `npm run build`
7. `npm run test:unit`
8. `npm run test:integration`

## Job frontend

Diretorio: `frontend`

Passos:
1. checkout
2. setup Node 22
3. `npm ci`
4. `npm audit signatures`
5. `npm audit --audit-level=high`
6. `npm run typecheck`
7. `npm run lint`
8. `npm run check-theme-contract`
9. `npm run check:tokens`
10. `npm run test`
11. `npm run build`

## Job frontend-e2e-smoke

Diretorio: `frontend`

Passos:
1. checkout
2. setup Node 22
3. `npm ci`
4. `npx playwright install --with-deps chromium`
5. `npm run test:e2e -- --grep "E2E smoke"`

Nota:
- `npm run lint` ja executa `check-theme-contract` e `check:tokens`.
- os passos 6 e 7 mantem guardrails explicitos no workflow.
- o smoke E2E de Playwright corre como gate dedicado na CI.

## Politica recomendada de branch

- PR obrigatoria para main
- merge condicionado a CI verde
- sem bypass para testes falhados

## Melhorias futuras (sugestao)

- adicionar cobertura de testes (threshold)
- adicionar changelog automatizado
- adicionar deploy preview por PR
