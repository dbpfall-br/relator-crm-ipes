# Relator CRM — Backend

API-first CRM: pipeline de vendas (Deals) em Kanban, atividades, tempo real e JWT.
Stack: **Node + TypeScript + Express + Prisma + PostgreSQL + Socket.IO + Zod**.

## Passo 1 — Schema do banco

Ver [`prisma/schema.prisma`](prisma/schema.prisma). Entidades:

| Modelo | Papel |
|---|---|
| `User` | Vendedores/gestores, `role` (ADMIN/MANAGER/SALES) e hierarquia (`managerId` self-relation) |
| `Company` / `Contact` | Empresas e contatos, com `customFields Json` (JSONB) para campos do usuário final |
| `Pipeline` / `Stage` | Funil e colunas do Kanban (`position` ordena as colunas) |
| `Deal` | Negociação: `amountCents`, `status` (OPEN/WON/LOST), `stageId`, `position` (ordem vertical) |
| `Activity` | Histórico (timeline) e tarefas futuras (`dueAt`, `done`) |
| `RefreshToken` | Sessões revogáveis (rotação de refresh token) |

> Dinheiro em **centavos** (`Int`) evita erros de ponto flutuante. Campos customizados em **JSONB**.

## Passo 2 — Estrutura de pastas

```
backend/
├─ prisma/
│  ├─ schema.prisma          # modelo de dados
│  └─ seed.ts                # pipeline padrão + admin + deal de exemplo
├─ src/
│  ├─ config/env.ts          # env tipado (JWT, CORS, DB)
│  ├─ lib/prisma.ts          # singleton do Prisma
│  ├─ utils/                 # jwt, http-error, async-handler
│  ├─ middleware/            # authenticate, authorize, validate (Zod), error-handler
│  ├─ realtime/io.ts         # Socket.IO (handshake JWT, salas por usuário/pipeline)
│  ├─ modules/
│  │  ├─ auth/               # register, login, refresh, logout, me
│  │  └─ deals/              # CRUD + board (Kanban) + move + win/lose
│  ├─ openapi.ts             # contrato OpenAPI 3.1
│  ├─ app.ts                 # montagem do Express
│  └─ server.ts              # HTTP + WebSocket + shutdown gracioso
```

Regra de ouro (separação de contextos): **rotas → controllers → services**. Toda a
lógica de negócio vive nos `*.service.ts`, sem depender de `req`/`res` — reutilizável
por scripts, CLIs e agentes de IA que operem o CRM direto pela API.

## Como rodar

```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL e os segredos JWT
npm install
npm run prisma:migrate        # cria as tabelas no PostgreSQL
npm run db:seed               # pipeline padrão + admin@relator.dev / admin12345
npm run dev                   # http://localhost:4000
```

## Endpoints (Passo 3)

Base: `http://localhost:4000/api` — contrato em `GET /api/openapi.json`.

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | cria usuário, retorna `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | login por e-mail/senha |
| POST | `/auth/refresh` | rotaciona tokens |
| POST | `/auth/logout` | revoga o refresh token |
| GET | `/auth/me` | perfil autenticado (Bearer) |

### Deals (todas exigem `Authorization: Bearer <accessToken>`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/deals` | lista com filtros (`status`, `stageId`, `q`) + paginação |
| GET | `/deals/board` | pipeline agrupado por etapa (pronto p/ Kanban) |
| GET | `/deals/:id` | detalhe |
| POST | `/deals` | cria (entra no topo da coluna) |
| PATCH | `/deals/:id` | atualiza |
| POST | `/deals/:id/move` | move no Kanban (`{ stageId, position }`) → emite `deal:moved` |
| POST | `/deals/:id/win` \| `/lose` | fecha ganha/perdida |
| DELETE | `/deals/:id` | remove |

**Visibilidade por papel:** SALES vê os próprios deals; MANAGER vê os seus + da equipe
subordinada; ADMIN vê tudo.

## Tempo real (WebSocket)

Socket.IO no mesmo host. Handshake autenticado por JWT:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', { auth: { token: accessToken } });
socket.on('deal:moved', ({ deal, from, to }) => { /* reposicionar card no Kanban */ });
socket.on('deal:created', (deal) => { /* ... */ });
```

Eventos: `deal:created`, `deal:updated`, `deal:moved`, `deal:deleted`,
`activity:created`, `task:due`.

## Testes automatizados

Vitest + supertest. Rodam contra um **schema isolado** (`test`) no mesmo Postgres —
não tocam nos dados de desenvolvimento (`public`). O schema é criado automaticamente
(`prisma db push`) e cada teste começa com as tabelas limpas.

```bash
npm test          # roda toda a suíte uma vez
npm run test:watch  # modo interativo (re-roda ao salvar)
```

Cobertura atual (20 casos): autenticação (registro/login/401/409/validação),
CRUD e regras de Deals (criação, board, mover, ganhar, **visibilidade por papel**,
campos JSONB), webhooks (admin-only, 403 para não-admin) e o filtro de visibilidade.

> Pré-requisito: o Postgres do `docker compose up -d` precisa estar no ar.

## Webhooks de saída (automações / agentes de IA)

Endpoints `ADMIN`-only sob `/api/webhooks` (CRUD + `POST /:id/test`). Ao registrar,
o servidor gera um `secret` (mostrado uma vez). Cada entrega é um `POST` com:

- Header `X-Relator-Event`: nome do evento (ex.: `deal.created`)
- Header `X-Relator-Signature`: `sha256=<HMAC-SHA256(body, secret)>`
- Body: `{ "event", "data", "timestamp" }`

Eventos: `deal.created`, `deal.updated`, `deal.moved`, `deal.deleted`,
`deal.won`, `deal.lost`, `activity.created`. Assinar `events: []` recebe todos.
Todas as entregas ficam logadas em `webhook_deliveries` (visível em `GET /webhooks/:id`).

Validação da assinatura no receptor (Node):

```js
import { createHmac } from 'node:crypto';
const expected = 'sha256=' + createHmac('sha256', SECRET).update(rawBody).digest('hex');
const ok = expected === req.headers['x-relator-signature']; // compare em tempo constante em produção
```

## Exemplo rápido (curl)

```bash
# login
curl -s localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@relator.dev","password":"admin12345"}'

# board (troque TOKEN pelo accessToken retornado)
curl -s localhost:4000/api/deals/board -H 'Authorization: Bearer TOKEN'
```
