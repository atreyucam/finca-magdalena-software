#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <dev|prod|test> [docker compose args...]"
  exit 1
fi

target="$1"
shift || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$target" in
  dev)
    base_args=(-f docker-compose.yml -f docker-compose.dev.yml)
    ;;
  prod)
    base_args=(--env-file backend/.env.prod -f docker-compose.yml -f docker-compose.prod.yml)
    ;;
  test)
    base_args=(-f docker-compose.yml -f docker-compose.test.yml)
    ;;
  *)
    echo "Target no valido: $target (usa dev|prod|test)"
    exit 1
    ;;
esac

if [[ $# -eq 0 ]]; then
  set -- up --build -d
fi

cd "$ROOT_DIR"
docker compose "${base_args[@]}" "$@"
