import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { dealVisibilityFilter } from '../../utils/visibility.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';

// KPIs do dashboard, respeitando a visibilidade por papel do usuário.
export async function summary(user: AccessTokenPayload) {
  const scope = await dealVisibilityFilter(user);

  const withStatus = (status: 'OPEN' | 'WON' | 'LOST'): Prisma.DealWhereInput => ({
    AND: [scope, { status }],
  });

  const [open, won, lost, openValue, wonValue, byStageRaw] = await Promise.all([
    prisma.deal.count({ where: withStatus('OPEN') }),
    prisma.deal.count({ where: withStatus('WON') }),
    prisma.deal.count({ where: withStatus('LOST') }),
    prisma.deal.aggregate({ where: withStatus('OPEN'), _sum: { amountCents: true } }),
    prisma.deal.aggregate({ where: withStatus('WON'), _sum: { amountCents: true } }),
    prisma.deal.groupBy({
      by: ['stageId'],
      where: withStatus('OPEN'),
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ]);

  // Enriquece o agrupamento por etapa com nome/posição do stage.
  const stages = await prisma.stage.findMany({
    where: { id: { in: byStageRaw.map((s) => s.stageId) } },
    select: { id: true, name: true, position: true },
  });
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  const byStage = byStageRaw
    .map((row) => ({
      stageId: row.stageId,
      stageName: stageMap.get(row.stageId)?.name ?? '—',
      position: stageMap.get(row.stageId)?.position ?? 0,
      count: row._count._all,
      valueCents: row._sum.amountCents ?? 0,
    }))
    .sort((a, b) => a.position - b.position);

  const closed = won + lost;
  const winRate = closed === 0 ? 0 : Math.round((won / closed) * 100);

  return {
    counts: { open, won, lost, total: open + won + lost },
    pipelineValueCents: openValue._sum.amountCents ?? 0, // valor total em aberto
    wonValueCents: wonValue._sum.amountCents ?? 0,
    winRate, // % de conversão sobre negócios fechados
    byStage, // distribuição do funil (abertos)
  };
}
