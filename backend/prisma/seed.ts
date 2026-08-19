import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Popula um pipeline padrão, etapas do funil e um usuário admin de exemplo.
async function main() {
  const pipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Pipeline de Vendas',
      isDefault: true,
      stages: {
        create: [
          { name: 'Prospecção', position: 0, probability: 10 },
          { name: 'Qualificação', position: 1, probability: 30 },
          { name: 'Proposta', position: 2, probability: 60 },
          { name: 'Negociação', position: 3, probability: 80 },
          { name: 'Fechamento', position: 4, probability: 100 },
        ],
      },
    },
    include: { stages: true },
  });

  const passwordHash = await bcrypt.hash('admin12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@relator.dev' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@relator.dev',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // Um deal de exemplo na primeira etapa.
  const firstStage = pipeline.stages.sort((a, b) => a.position - b.position)[0]!;
  await prisma.deal.create({
    data: {
      title: 'Oportunidade de exemplo — ACME',
      amountCents: 1500000, // R$ 15.000,00
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      ownerId: admin.id,
    },
  });

  console.log('✅ Seed concluído.');
  console.log('   Login de exemplo: admin@relator.dev / admin12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
