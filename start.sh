#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Relator CRM — iniciando..."

# 1. Banco
echo "📦 Subindo PostgreSQL (Docker)..."
cd "$ROOT/backend"
docker compose up -d

# aguarda o Postgres aceitar conexões
echo "⏳ Aguardando banco ficar pronto..."
until docker compose exec -T relator_crm_db pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done
echo "✅ Banco pronto."

# 2. API (em background, log em /tmp/relator-api.log)
echo "🔧 Iniciando API..."
npm run dev > /tmp/relator-api.log 2>&1 &
API_PID=$!
echo "   API rodando (PID $API_PID) — log em /tmp/relator-api.log"

# aguarda a API responder
echo "⏳ Aguardando API ficar pronta..."
until curl -s --max-time 1 http://localhost:4000/health > /dev/null 2>&1; do
  sleep 1
done
echo "✅ API pronta em http://localhost:4000"

# 3. Frontend (em foreground — Ctrl+C encerra tudo)
echo "🎨 Iniciando frontend..."
cd "$ROOT/frontend"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Relator CRM rodando!"
echo "  🌐 Acesse: http://localhost:5173"
echo "  👤 Login:  admin@relator.dev / admin12345"
echo "  📋 Logs da API: tail -f /tmp/relator-api.log"
echo "  ⛔ Para parar: Ctrl+C (para o frontend e a API)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# encerra a API quando o frontend for parado (Ctrl+C)
trap "echo ''; echo '⛔ Encerrando...'; kill $API_PID 2>/dev/null; exit 0" INT TERM

npm run dev
