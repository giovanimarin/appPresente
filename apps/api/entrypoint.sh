#!/bin/sh
set -e

echo "[entrypoint] Rodando migrações..."
cd /app/apps/api
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Iniciando aplicação..."
exec dumb-init node /app/apps/api/dist/app.js
