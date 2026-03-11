# Documentacao do Projeto

Este diretorio contem a documentacao tecnica oficial do `Finance v2` / `Pouperrimo`.

## Mapa rapido

### Arquitetura
- [Visao geral do sistema](./architecture/system-overview.md)
- [Modelo de dominio e dados](./architecture/domain-model.md)

### Backend
- [Backend overview](./backend/README.md)
- [Setup e configuracao](./backend/setup-config.md)
- [Referencia da API](./backend/api-reference.md)
- [Regras de negocio](./backend/business-rules.md)
- [Modelo de dados (Mongo)](./backend/data-model.md)
- [Operacao e manutencao](./backend/operations.md)
- [Testes backend](./backend/testing.md)

### Frontend
- [Frontend overview](./frontend/README.md)
- [Setup e configuracao](./frontend/setup-config.md)
- [Arquitetura frontend](./frontend/architecture.md)
- [Ecras e fluxos](./frontend/screens-flows.md)
- [Estado, API client e contextos](./frontend/state-and-api.md)
- [Qualidade, testes e build](./frontend/quality-testing.md)

### Operacoes
- [Deploy](./operations/deployment.md)
- [CI/CD](./operations/ci-cd.md)
- [Runbooks e troubleshooting](./operations/runbooks.md)

## Convencoes

- Todas as rotas backend usam prefixo `/api/v1`.
- Todas as datas de negocio sao tratadas em UTC no backend para evitar drift de mes.
- O contexto funcional de dados financeiros e `accountId` (nao `userId`).
- O frontend e otimizado para mobile e exibe aviso em viewport larga, sem bloquear uso.

## Leitura recomendada por objetivo

- Onboarding tecnico rapido:
  - `architecture/system-overview.md`
  - `backend/README.md`
  - `frontend/README.md`
- Integrar frontend com API:
  - `backend/api-reference.md`
  - `frontend/state-and-api.md`
- Operar em producao:
  - `backend/operations.md`
  - `operations/deployment.md`
  - `operations/runbooks.md`
