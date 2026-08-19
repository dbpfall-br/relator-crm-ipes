import type { PipelineKind } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { CreatePipelineInput, UpdatePipelineInput } from './pipelines.schema.js';

// Etapas padrão criadas junto com um novo funil, conforme o tipo.
const DEFAULT_STAGES: Record<PipelineKind, { name: string; probability: number }[]> = {
  SALES: [
    { name: 'Novo', probability: 10 },
    { name: 'Em andamento', probability: 40 },
    { name: 'Proposta', probability: 70 },
    { name: 'Fechamento', probability: 100 },
  ],
  LEADS: [
    { name: 'Novo lead', probability: 0 },
    { name: 'Contatado', probability: 0 },
    { name: 'Qualificado', probability: 0 },
  ],
};

export async function list() {
  return prisma.pipeline.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { stages: true, deals: true } } },
  });
}

export async function create(input: CreatePipelineInput) {
  const last = await prisma.pipeline.findFirst({ orderBy: { position: 'desc' } });
  return prisma.pipeline.create({
    data: {
      name: input.name,
      kind: input.kind,
      position: (last?.position ?? -1) + 1,
      stages: {
        create: DEFAULT_STAGES[input.kind].map((s, i) => ({
          name: s.name,
          position: i,
          probability: s.probability,
        })),
      },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  });
}

export async function update(id: string, input: UpdatePipelineInput) {
  // Definir como padrão desmarca os demais (só um funil padrão por vez).
  if (input.isDefault === true) {
    await prisma.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  return prisma.pipeline.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    },
  });
}

export async function remove(id: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: { _count: { select: { deals: true } } },
  });
  if (!pipeline) throw HttpError.notFound('Funil não encontrado');
  if (pipeline._count.deals > 0) {
    throw HttpError.conflict(
      `Este funil tem ${pipeline._count.deals} negociação(ões). Mova-as antes de excluir.`,
    );
  }
  if (pipeline.isDefault) throw HttpError.badRequest('Não é possível excluir o funil padrão');

  const salesCount = await prisma.pipeline.count({ where: { kind: 'SALES' } });
  if (pipeline.kind === 'SALES' && salesCount <= 1) {
    throw HttpError.badRequest('É preciso manter ao menos um funil de vendas');
  }

  await prisma.pipeline.delete({ where: { id } });
}
