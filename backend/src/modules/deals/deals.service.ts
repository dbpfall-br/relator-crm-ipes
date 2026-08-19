import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import { publishPipeline } from '../../events/publish.js';
import { dealVisibilityFilter } from '../../utils/visibility.js';
import { validateValues } from '../custom-fields/custom-fields.service.js';
import { runAutomations } from '../automation/automation.engine.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';
import type {
  CreateDealInput,
  ListDealsQuery,
  MoveDealInput,
  UpdateDealInput,
} from './deals.schema.js';

// Include padrão para retornar o deal já "hidratado" para a UI.
const dealInclude = {
  stage: { select: { id: true, name: true, position: true } },
  pipeline: { select: { id: true, name: true, kind: true } },
  owner: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  source: { select: { id: true, label: true } },
  campaign: { select: { id: true, label: true } },
  lossReason: { select: { id: true, label: true } },
} satisfies Prisma.DealInclude;

// Garante que o usuário pode ver/alterar o deal alvo — senão 404 (não vaza existência).
async function getVisibleDealOrThrow(id: string, user: AccessTokenPayload) {
  const where = { AND: [{ id }, await dealVisibilityFilter(user)] };
  const deal = await prisma.deal.findFirst({ where, include: dealInclude });
  if (!deal) throw HttpError.notFound('Negociação não encontrada');
  return deal;
}

async function resolveDefaultPipelineAndStage(pipelineId?: string, stageId?: string) {
  const pipeline = pipelineId
    ? await prisma.pipeline.findUnique({ where: { id: pipelineId }, include: { stages: true } })
    : await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { position: 'asc' } } },
      });

  if (!pipeline) {
    throw HttpError.badRequest(
      'Nenhum pipeline encontrado. Rode o seed ou crie um pipeline padrão.',
    );
  }

  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);
  const stage = stageId
    ? stages.find((s) => s.id === stageId)
    : stages[0];

  if (!stage) throw HttpError.badRequest('Etapa (stage) inválida para este pipeline');
  return { pipelineId: pipeline.id, stageId: stage.id };
}

// Monta o filtro Prisma a partir da query (reutilizado por listDeals e export).
async function buildWhere(
  user: AccessTokenPayload,
  query: ListDealsQuery,
): Promise<Prisma.DealWhereInput> {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.createdFrom) createdAt.gte = query.createdFrom;
  if (query.createdTo) createdAt.lte = query.createdTo;

  return {
    AND: [
      await dealVisibilityFilter(user),
      query.pipelineId ? { pipelineId: query.pipelineId } : {},
      query.stageId ? { stageId: query.stageId } : {},
      query.ownerId ? { ownerId: query.ownerId } : {},
      query.companyId ? { companyId: query.companyId } : {},
      query.status ? { status: query.status } : {},
      query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {},
      query.createdFrom || query.createdTo ? { createdAt } : {},
      // sem tarefa em aberto: nenhuma atividade com done=false
      query.withoutTask ? { activities: { none: { done: false } } } : {},
    ],
  };
}

function orderByFor(query: ListDealsQuery): Prisma.DealOrderByWithRelationInput {
  if (query.sort === 'value') return { amountCents: query.order };
  if (query.sort === 'closeDate') return { expectedCloseDate: query.order };
  return { createdAt: query.order };
}

export async function listDeals(user: AccessTokenPayload, query: ListDealsQuery) {
  const where = await buildWhere(user, query);

  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: dealInclude,
      orderBy: orderByFor(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

// Exporta as negociações (respeitando filtros + visibilidade) como CSV.
export async function exportDealsCsv(user: AccessTokenPayload, query: ListDealsQuery): Promise<string> {
  const where = await buildWhere(user, query);
  const deals = await prisma.deal.findMany({ where, include: dealInclude, orderBy: orderByFor(query) });

  const header = [
    'Titulo',
    'Valor',
    'Moeda',
    'Status',
    'Etapa',
    'Qualificacao',
    'Responsavel',
    'Empresa',
    'Contato',
    'Fonte',
    'Campanha',
    'Motivo da perda',
    'Fechamento previsto',
    'Criado em',
  ];

  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    // Escapa aspas e envolve em aspas se necessário (RFC 4180).
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = deals.map((d) =>
    [
      d.title,
      (d.amountCents / 100).toFixed(2),
      d.currency,
      d.status,
      d.stage.name,
      d.qualification,
      d.owner.name,
      d.company?.name ?? '',
      d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ''}`.trim() : '',
      d.source?.label ?? '',
      d.campaign?.label ?? '',
      d.lossReason?.label ?? '',
      d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : '',
      d.createdAt.toISOString().slice(0, 10),
    ]
      .map(esc)
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

// Retorna o pipeline agrupado por etapa — formato pronto para o Kanban.
export async function getBoard(user: AccessTokenPayload, pipelineId?: string) {
  const pipeline = pipelineId
    ? await prisma.pipeline.findUnique({ where: { id: pipelineId } })
    : await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (!pipeline) throw HttpError.notFound('Pipeline não encontrado');

  const stages = await prisma.stage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { position: 'asc' },
  });

  const deals = await prisma.deal.findMany({
    where: {
      AND: [{ pipelineId: pipeline.id, status: 'OPEN' }, await dealVisibilityFilter(user)],
    },
    include: dealInclude,
    orderBy: [{ stage: { position: 'asc' } }, { position: 'asc' }],
  });

  return {
    pipeline: { id: pipeline.id, name: pipeline.name, kind: pipeline.kind },
    columns: stages.map((stage) => ({
      stage: { id: stage.id, name: stage.name, position: stage.position },
      deals: deals.filter((d) => d.stageId === stage.id),
    })),
  };
}

export async function getDeal(id: string, user: AccessTokenPayload) {
  return getVisibleDealOrThrow(id, user);
}

export async function createDeal(user: AccessTokenPayload, input: CreateDealInput) {
  await validateValues('DEAL', input.customFields);
  const { pipelineId, stageId } = await resolveDefaultPipelineAndStage(
    input.pipelineId,
    input.stageId,
  );
  const ownerId = input.ownerId ?? user.sub;

  // Nova negociação entra no topo da coluna (position = 0), empurra as demais.
  const deal = await prisma.$transaction(async (tx) => {
    await tx.deal.updateMany({
      where: { stageId },
      data: { position: { increment: 1 } },
    });
    return tx.deal.create({
      data: {
        title: input.title,
        amountCents: input.amountCents,
        currency: input.currency,
        expectedCloseDate: input.expectedCloseDate,
        pipelineId,
        stageId,
        ownerId,
        contactId: input.contactId,
        companyId: input.companyId,
        sourceId: input.sourceId,
        campaignId: input.campaignId,
        ...(input.qualification && { qualification: input.qualification }),
        customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
        position: 0,
      },
      include: dealInclude,
    });
  });

  publishPipeline('deal:created', deal);
  runAutomations('DEAL_CREATED', deal);
  return deal;
}

export async function updateDeal(id: string, user: AccessTokenPayload, input: UpdateDealInput) {
  await getVisibleDealOrThrow(id, user); // valida visibilidade
  if (input.customFields !== undefined) await validateValues('DEAL', input.customFields, { partial: true });

  const data: Prisma.DealUpdateInput = {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.amountCents !== undefined && { amountCents: input.amountCents }),
    ...(input.currency !== undefined && { currency: input.currency }),
    ...(input.expectedCloseDate !== undefined && {
      expectedCloseDate: input.expectedCloseDate,
    }),
    ...(input.customFields !== undefined && {
      customFields: input.customFields as Prisma.InputJsonValue,
    }),
    ...(input.contactId !== undefined && {
      contact: input.contactId ? { connect: { id: input.contactId } } : { disconnect: true },
    }),
    ...(input.companyId !== undefined && {
      company: input.companyId ? { connect: { id: input.companyId } } : { disconnect: true },
    }),
    ...(input.ownerId !== undefined && { owner: { connect: { id: input.ownerId } } }),
    ...(input.qualification !== undefined && { qualification: input.qualification }),
    ...(input.sourceId !== undefined && {
      source: input.sourceId ? { connect: { id: input.sourceId } } : { disconnect: true },
    }),
    ...(input.campaignId !== undefined && {
      campaign: input.campaignId ? { connect: { id: input.campaignId } } : { disconnect: true },
    }),
  };

  const deal = await prisma.deal.update({ where: { id }, data, include: dealInclude });
  publishPipeline('deal:updated', deal);
  return deal;
}

// Mover no Kanban (drag-and-drop): muda etapa e/ou posição vertical.
export async function moveDeal(id: string, user: AccessTokenPayload, input: MoveDealInput) {
  const current = await getVisibleDealOrThrow(id, user);

  const targetStage = await prisma.stage.findUnique({ where: { id: input.stageId } });
  if (!targetStage) throw HttpError.badRequest('Etapa de destino inválida');

  const deal = await prisma.$transaction(async (tx) => {
    // Abre espaço na coluna de destino a partir da posição desejada.
    await tx.deal.updateMany({
      where: { stageId: input.stageId, position: { gte: input.position } },
      data: { position: { increment: 1 } },
    });
    return tx.deal.update({
      where: { id },
      data: { stageId: input.stageId, position: input.position },
      include: dealInclude,
    });
  });

  publishPipeline('deal:moved', {
    deal,
    from: { stageId: current.stageId, position: current.position },
    to: { stageId: input.stageId, position: input.position },
  });
  runAutomations('DEAL_MOVED', deal);
  return deal;
}

// Fecha a negociação como ganha ou perdida (perda registra o motivo).
export async function closeDeal(
  id: string,
  user: AccessTokenPayload,
  won: boolean,
  lossReasonId?: string,
) {
  await getVisibleDealOrThrow(id, user);
  const deal = await prisma.deal.update({
    where: { id },
    data: {
      status: won ? 'WON' : 'LOST',
      closedAt: new Date(),
      // Ao ganhar, limpa qualquer motivo de perda anterior.
      lossReasonId: won ? null : (lossReasonId ?? null),
    },
    include: dealInclude,
  });
  // Socket recebe 'deal:updated'; webhooks recebem 'deal.won'/'deal.lost'.
  publishPipeline('deal:updated', deal, won ? 'deal.won' : 'deal.lost');
  runAutomations(won ? 'DEAL_WON' : 'DEAL_LOST', deal);
  return deal;
}

// Converte um lead (deal em funil LEADS) numa negociação do funil de vendas padrão.
export async function convertLead(id: string, user: AccessTokenPayload) {
  const deal = await getVisibleDealOrThrow(id, user);
  if (deal.pipeline.kind !== 'LEADS') {
    throw HttpError.badRequest('Apenas leads (funil de pré-vendas) podem ser convertidos');
  }

  const salesPipeline = await prisma.pipeline.findFirst({
    where: { kind: 'SALES', isDefault: true },
    include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
  }) ?? await prisma.pipeline.findFirst({
    where: { kind: 'SALES' },
    include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
  });

  const firstStage = salesPipeline?.stages[0];
  if (!salesPipeline || !firstStage) {
    throw HttpError.badRequest('Nenhum funil de vendas com etapas foi encontrado');
  }

  const converted = await prisma.$transaction(async (tx) => {
    await tx.deal.updateMany({ where: { stageId: firstStage.id }, data: { position: { increment: 1 } } });
    return tx.deal.update({
      where: { id },
      data: {
        pipelineId: salesPipeline.id,
        stageId: firstStage.id,
        position: 0,
        convertedAt: new Date(),
      },
      include: dealInclude,
    });
  });

  publishPipeline('deal:moved', { deal: converted, converted: true }, 'deal.converted');
  runAutomations('DEAL_CONVERTED', converted);
  return converted;
}

export async function deleteDeal(id: string, user: AccessTokenPayload) {
  await getVisibleDealOrThrow(id, user);
  await prisma.deal.delete({ where: { id } });
  publishPipeline('deal:deleted', { id });
}
