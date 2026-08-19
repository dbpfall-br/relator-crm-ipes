# Relator CRM — Frontend

SPA React + TypeScript + Vite. Consome a API do `../backend`.

## Stack
- **React 19 + Vite** — SPA rápida
- **react-router-dom** — rotas protegidas por autenticação
- **@dnd-kit** — drag-and-drop do Kanban
- **socket.io-client** — atualização do pipeline em tempo real
- CSS puro com design tokens (tema claro/escuro automático)

## Estrutura
```
src/
├─ lib/          config, types, api (fetch + refresh automático), socket, format
├─ context/      AuthContext (login/logout, /auth/me, persistência de token)
├─ components/   Layout (sidebar), ProtectedRoute, Modal
├─ pages/        Login, Dashboard, Board (Kanban), Tasks, Contacts, Companies
├─ App.tsx       rotas
└─ main.tsx
```

## Rodar
Suba o backend primeiro (`../backend`: Postgres + `npm run dev`). Depois:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (ou 5174 se ocupada)
```

Login do seed: **admin@relator.dev / admin12345**.

> A URL da API é `http://localhost:4000` por padrão. Para mudar, crie um `.env`
> com `VITE_API_URL=http://host:porta`. O backend precisa liberar a porta do
> Vite em `CORS_ORIGIN` (o `.env` do backend já inclui 5173 e 5174).

## Destaques
- **Kanban drag-and-drop** com atualização otimista + reconciliação via WebSocket.
- **Dashboard** com KPIs (abertas/ganhas/perdidas, taxa de conversão, valor em
  pipeline) e funil por etapa.
- **Auth resiliente**: refresh automático do access token em respostas 401.
