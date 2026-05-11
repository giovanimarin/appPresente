#!/bin/sh
set -e

echo "[entrypoint] Rodando migrações..."
/app/node_modules/.bin/prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma

echo "[entrypoint] Verificando seed inicial..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function seed() {
  const exists = await prisma.platformUser.findUnique({ where: { email: 'admin@presente.com.br' } });
  if (!exists) {
    const passwordHash = await bcrypt.hash('Platform@2026', 12);
    await prisma.platformUser.create({
      data: { name: 'Admin Plataforma', email: 'admin@presente.com.br', passwordHash }
    });
    console.log('[entrypoint] Admin criado.');
  } else {
    console.log('[entrypoint] Admin já existe, pulando seed.');
  }
  await prisma.\$disconnect();
}
seed().catch(e => { console.error('[entrypoint] Seed falhou:', e.message); process.exit(1); });
" 2>&1

echo "[entrypoint] Iniciando aplicação..."
exec dumb-init node /app/apps/api/dist/app.js
