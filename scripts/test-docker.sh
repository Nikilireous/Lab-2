#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export API_PORT=18000
trap 'docker compose -p lab3-check down -v >/dev/null' EXIT

docker compose -p lab3-check up -d --build --wait db api
set -a
source .env
set +a
LAB3_TEST_DATABASE=1 API_URL=http://127.0.0.1:18000/api/ \
    python3 java-backend/scripts/smoke_test.py
