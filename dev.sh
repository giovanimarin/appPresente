#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────────────────────
#  Presente — Script de desenvolvimento
#  Uso:
#    ./dev.sh          → sobe tudo (infra + migrate + servidores)
#    ./dev.sh --seed   → inclui seed do banco
#    ./dev.sh --reset  → recria o banco do zero (migrate reset + seed)
# ─────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
ENV_FILE="$API_DIR/.env"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[presente]${NC} $1"; }
warn() { echo -e "${YELLOW}[presente]${NC} $1"; }
fail() { echo -e "${RED}[presente]${NC} $1"; exit 1; }

# ── Flags ─────────────────────────────────────────────────────
SEED=false
RESET=false
for arg in "$@"; do
  case $arg in
    --seed)  SEED=true ;;
    --reset) RESET=true; SEED=true ;;
  esac
done

# ── 1. Verificar dependências ─────────────────────────────────
command -v docker  >/dev/null 2>&1 || fail "Docker não encontrado. Instale em https://docker.com"
command -v node    >/dev/null 2>&1 || fail "Node.js não encontrado."
command -v npm     >/dev/null 2>&1 || fail "npm não encontrado."

# ── 2. Configurar .env se não existir ─────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  warn ".env não encontrado — copiando do .env.example"
  cp "$ROOT/.env.example" "$ENV_FILE"
  log ".env criado em apps/api/.env (edite se necessário)"
fi

if [ ! -f "$WEB_DIR/.env.local" ]; then
  if [ -f "$WEB_DIR/.env.local.example" ]; then
    cp "$WEB_DIR/.env.local.example" "$WEB_DIR/.env.local"
  fi
fi

# ── 3. Subir infra com Docker Compose ─────────────────────────
log "Subindo PostgreSQL, Redis e MinIO..."
docker compose -f "$ROOT/docker-compose.yml" up -d --remove-orphans

# ── 4. Aguardar serviços ficarem saudáveis ─────────────────────
wait_healthy() {
  local service=$1
  local max=30
  local i=0
  while [ $i -lt $max ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "presente_${service}" 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
      log "$service pronto"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  fail "$service não ficou saudável em tempo hábil"
}

wait_healthy "postgres"
wait_healthy "redis"
wait_healthy "minio"

# ── 5. Instalar dependências ───────────────────────────────────
log "Instalando dependências npm..."
npm install --prefix "$ROOT" --silent

# ── 6. Gerar cliente Prisma ────────────────────────────────────
log "Gerando cliente Prisma..."
(cd "$API_DIR" && npx prisma generate --schema=prisma/schema.prisma)

# ── 7. Migrar banco ────────────────────────────────────────────
if $RESET; then
  warn "Resetando banco de dados..."
  (cd "$API_DIR" && npx prisma migrate reset --force --schema=prisma/schema.prisma)
else
  log "Rodando migrações..."
  (cd "$API_DIR" && npx prisma migrate deploy --schema=prisma/schema.prisma)
fi

# ── 8. Seed (opcional) ─────────────────────────────────────────
if $SEED; then
  log "Populando banco com dados de teste..."
  (cd "$API_DIR" && npx ts-node -r tsconfig-paths/register prisma/seed.ts)
fi

# ── 9. Iniciar servidores ──────────────────────────────────────
log "Iniciando API (porta 3001) e Web (porta 3000)..."
echo ""
echo "  Acesse:"
echo "    Web:          http://localhost:3000"
echo "    API:          http://localhost:3001"
echo "    MinIO:        http://localhost:9001  (user: presente_minio / presente_minio_secret)"
echo ""
echo "  Login staff:   admin@girassol.com.br  /  Presente@2026"
echo ""
echo "  Pressione Ctrl+C para parar os servidores."
echo ""

# Mata processos filhos ao sair
trap 'kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM

# Inicia API e Web em paralelo, redirecionando saída com prefixo
(cd "$API_DIR" && npm run dev 2>&1 | sed "s/^/  \033[36m[api]\033[0m /") &
(cd "$WEB_DIR" && npm run dev 2>&1 | sed "s/^/  \033[35m[web]\033[0m /") &

wait
