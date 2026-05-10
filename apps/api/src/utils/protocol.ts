import { prisma } from '../config/database';

/**
 * Gera protocolo no formato ANO-SEQ4D (ex: 2026-0042)
 * Sequência por escola, imutável após criação.
 */
export async function generateProtocol(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Conta comunicados do responsável desta escola no ano corrente
  const count = await prisma.communication.count({
    where: {
      schoolId,
      guardianId: { not: null },
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${year}-${seq}`;
}
