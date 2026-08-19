import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { dealVisibilityFilter } from '../../utils/visibility.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';

// Painel CRM Live: contadores do dia + totais em aberto (respeita visibilidade).
export async function live(user: AccessTokenPayload) {
  const scope = await dealVisibilityFilter(user);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const and = (extra: Prisma.DealWhereInput): Prisma.DealWhereInput => ({ AND: [scope, extra] });

  const [createdToday, wonToday, lostToday, open] = await Promise.all([
    prisma.deal.count({ where: and({ createdAt: { gte: startOfDay } }) }),
    prisma.deal.aggregate({
      where: and({ status: 'WON', closedAt: { gte: startOfDay } }),
      _count: true,
      _sum: { amountCents: true },
    }),
    prisma.deal.aggregate({
      where: and({ status: 'LOST', closedAt: { gte: startOfDay } }),
      _count: true,
      _sum: { amountCents: true },
    }),
    prisma.deal.aggregate({ where: and({ status: 'OPEN' }), _count: true, _sum: { amountCents: true } }),
  ]);

  return {
    createdToday,
    wonToday: { count: wonToday._count, valueCents: wonToday._sum.amountCents ?? 0 },
    lostToday: { count: lostToday._count, valueCents: lostToday._sum.amountCents ?? 0 },
    open: { count: open._count, valueCents: open._sum.amountCents ?? 0 },
  };
}

// Relatório de Negociações Concluídas: série mensal + ranking por responsável.
export async function closed(
  user: AccessTokenPayload,
  opts: { from?: Date; to?: Date; pipelineId?: string },
) {
  const scope = await dealVisibilityFilter(user);
  const closedAt: Prisma.DateTimeFilter = {};
  if (opts.from) closedAt.gte = opts.from;
  if (opts.to) closedAt.lte = opts.to;

  const where: Prisma.DealWhereInput = {
    AND: [
      scope,
      { status: { in: ['WON', 'LOST'] } },
      opts.from || opts.to ? { closedAt } : {},
      opts.pipelineId ? { pipelineId: opts.pipelineId } : {},
    ],
  };

  const deals = await prisma.deal.findMany({
    where,
    select: {
      amountCents: true,
      status: true,
      closedAt: true,
      owner: { select: { id: true, name: true } },
    },
  });

  let wonCount = 0, wonValue = 0, lostCount = 0, lostValue = 0;
  const byMonth = new Map<string, { wonValue: number; wonCount: number; lostCount: number }>();
  const byOwner = new Map<string, { name: string; wonValue: number; wonCount: number; lostCount: number }>();

  for (const d of deals) {
    const won = d.status === 'WON';
    if (won) { wonCount++; wonValue += d.amountCents; } else { lostCount++; lostValue += d.amountCents; }

    const key = (d.closedAt ?? new Date()).toISOString().slice(0, 7); // YYYY-MM
    const m = byMonth.get(key) ?? { wonValue: 0, wonCount: 0, lostCount: 0 };
    if (won) { m.wonValue += d.amountCents; m.wonCount++; } else m.lostCount++;
    byMonth.set(key, m);

    const o = byOwner.get(d.owner.id) ?? { name: d.owner.name, wonValue: 0, wonCount: 0, lostCount: 0 };
    if (won) { o.wonValue += d.amountCents; o.wonCount++; } else o.lostCount++;
    byOwner.set(d.owner.id, o);
  }

  const closedTotal = wonCount + lostCount;
  return {
    totals: {
      wonCount,
      wonValueCents: wonValue,
      lostCount,
      lostValueCents: lostValue,
      winRate: closedTotal ? Math.round((wonCount / closedTotal) * 100) : 0,
    },
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    byOwner: [...byOwner.entries()]
      .map(([ownerId, v]) => ({ ownerId, ...v }))
      .sort((a, b) => b.wonValue - a.wonValue),
  };
}
