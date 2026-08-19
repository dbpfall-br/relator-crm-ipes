import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import { emitPipeline } from '../../realtime/io.js';
import type {
  CreateStageInput,
  ReorderStagesInput,
  UpdateStageInput,
} from './stages.schema.js';

async function resolvePipelineId(pipelineId?: string): Promise<string> {
  if (pipelineId) return pipelineId;
  const pipeline = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (!pipeline) throw HttpError.badRequest('Nenhum pipeline padrão encontrado');
  return pipeline.id;
}

export async function list(pipelineId?: string) {
  const pid = await resolvePipelineId(pipelineId);
  return prisma.stage.findMany({
    where: { pipelineId: pid },
    orderBy: { position: 'asc' },
    include: { _count: { select: { deals: true } } },
  });
}

export async function create(input: CreateStageInput) {
  const pipelineId = await resolvePipelineId(input.pipelineId);
  // Nova etapa entra no fim do funil (maior position + 1).
  const last = await prisma.stage.findFirst({
    where: { pipelineId },
    orderBy: { position: 'desc' },
  });
  const position = (last?.position ?? -1) + 1;

  const stage = await prisma.stage.create({
    data: { name: input.name, probability: input.probability, pipelineId, position },
  });
  emitPipeline('stage:changed', { action: 'created', stage });
  return stage;
}

export async function update(id: string, input: UpdateStageInput) {
  const stage = await prisma.stage.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.probability !== undefined && { probability: input.probability }),
    },
  });
  emitPipeline('stage:changed', { action: 'updated', stage });
  return stage;
}

export async function remove(id: string) {
  // Não permite excluir etapa com negociações — evita órfãos silenciosos.
  const count = await prisma.deal.count({ where: { stageId: id } });
  if (count > 0) {
    throw HttpError.conflict(
      `Esta etapa tem ${count} negociação(ões). Mova-as para outra etapa antes de excluir.`,
    );
  }
  // Não deixa o pipeline sem nenhuma etapa.
  const stage = await prisma.stage.findUnique({ where: { id } });
  if (!stage) throw HttpError.notFound('Etapa não encontrada');
  const total = await prisma.stage.count({ where: { pipelineId: stage.pipelineId } });
  if (total <= 1) throw HttpError.badRequest('O pipeline precisa de ao menos uma etapa');

  await prisma.stage.delete({ where: { id } });
  emitPipeline('stage:changed', { action: 'deleted', stageId: id });
}

// Reordena as colunas. Como (pipelineId, position) é único, aplicamos em duas
// fases dentro de uma transação: desloca todas para posições altas e depois
// grava a ordem final — evitando colisão de unicidade no meio do caminho.
export async function reorder(input: ReorderStagesInput) {
  const pipelineId = await resolvePipelineId(input.pipelineId);
  const stages = await prisma.stage.findMany({ where: { pipelineId } });
  const ids = new Set(stages.map((s) => s.id));

  if (input.orderedIds.length !== stages.length || !input.orderedIds.every((id) => ids.has(id))) {
    throw HttpError.badRequest('A lista deve conter exatamente todas as etapas do pipeline');
  }

  await prisma.$transaction([
    // Fase 1: afasta todas para posições altas e livres de colisão.
    ...stages.map((s, i) =>
      prisma.stage.update({ where: { id: s.id }, data: { position: 1000 + i } }),
    ),
    // Fase 2: aplica a ordem final (0, 1, 2, ...).
    ...input.orderedIds.map((id, i) =>
      prisma.stage.update({ where: { id }, data: { position: i } }),
    ),
  ]);

  emitPipeline('stage:changed', { action: 'reordered', pipelineId });
  return list(pipelineId);
}
