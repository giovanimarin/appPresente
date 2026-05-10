import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed: criando admin da plataforma...');

  const passwordHash = await bcrypt.hash('Platform@2026', 12);

  await prisma.platformUser.upsert({
    where: { email: 'admin@presente.com.br' },
    update: {},
    create: {
      name: 'Admin Plataforma',
      email: 'admin@presente.com.br',
      passwordHash,
    },
  });

  console.log('✅ Platform admin criado');
  console.log('\n📋 Credenciais:');
  console.log('  Email:  admin@presente.com.br');
  console.log('  Senha:  Platform@2026');
  console.log('  URL:    http://localhost:3000/platform');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
