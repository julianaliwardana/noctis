#!/usr/bin/env bash
# Deploy the current main. Run on the server: ./deploy.sh
# Rollback: TAG=<old-sha> docker compose -f docker-compose.prod.yml up -d
set -euo pipefail
cd "$(dirname "$0")"

git pull
TAG=$(git rev-parse --short HEAD)
export TAG

docker compose -f docker-compose.prod.yml up -d --build
docker tag "noctis:$TAG" noctis:latest

echo "deployed $TAG — roll back with: TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d"
docker image ls noctis --format '  {{.Tag}}\t{{.CreatedSince}}'
