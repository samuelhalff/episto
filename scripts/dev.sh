#!/usr/bin/env bash
set -euo pipefail

# Swiss Mail — Local Development
# Prerequisites: Docker
#
# Usage:
#   ./scripts/dev.sh              # Start everything via Docker Compose (hot reload)
#   ./scripts/dev.sh --local      # Start infra in Docker, app servers locally (npm)
#   ./scripts/dev.sh down         # Stop all services

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn()  { echo -e "${YELLOW}[dev]${NC} $*"; }
error() { echo -e "${RED}[dev]${NC} $*" >&2; }

# ── Check prerequisites ─────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Install Docker Desktop or Docker Engine."
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon is not running. Start Docker and try again."
  exit 1
fi

# ── Handle 'down' command ───────────────────────────────────────────
if [[ "${1:-}" == "down" ]]; then
  info "Stopping all services..."
  docker compose -f docker-compose.dev.yml down
  exit 0
fi

# ── Default: All-in-Docker mode ─────────────────────────────────────
if [[ "${1:-}" != "--local" ]]; then
  info "Starting all services via Docker Compose (hot reload)..."
  info "────────────────────────────────────────────────"
  info "  Frontend: http://localhost:3000"
  info "  Backend:  http://localhost:4000"
  info "  MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
  info "────────────────────────────────────────────────"
  docker compose -f docker-compose.dev.yml up --build
  exit 0
fi

# ── Local mode: infra in Docker, app locally ────────────────────────
if ! command -v node &>/dev/null; then
  error "Node.js is not installed (required for --local mode)."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  info "Installing dependencies..."
  npm install
fi

info "Starting infrastructure (Postgres, Redis, MinIO)..."
docker compose up -d postgres redis minio minio-setup
docker compose up -d --wait postgres redis minio

info "Building shared package..."
npm run build -w shared

info "Running database migrations..."
cd backend
npx drizzle-kit push 2>/dev/null || warn "drizzle-kit push failed — you may need to run migrations manually"
cd "$REPO_ROOT"

info "Starting backend (port 4000) and frontend (port 3000)..."

cleanup() {
  info "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run dev -w backend &
BACKEND_PID=$!
sleep 2
npm run dev -w frontend &
FRONTEND_PID=$!

info "────────────────────────────────────────────────"
info "Swiss Mail is running!"
info "  Frontend: http://localhost:3000"
info "  Backend:  http://localhost:4000"
info "  MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
info "────────────────────────────────────────────────"
info "Press Ctrl+C to stop all services."

wait -n $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
