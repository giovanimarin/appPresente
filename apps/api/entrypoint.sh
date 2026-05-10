#!/bin/sh
set -e

echo "[entrypoint] Rodando migrações..."
/app/node_modules/.bin/prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma

echo "[entrypoint] Iniciando aplicação..."
exec dumb-init node /app/apps/api/dist/app.js
