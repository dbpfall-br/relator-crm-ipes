import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const createSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Use AAAA-MM'),
  metric: z.enum(['WON_VALUE', 'WON_COUNT']),
  target: z.number().int().positive(),
  userId: z.string().uuid().nullable().optional(),
});

// Intervalo [início, fim) do mês a partir de "AAAA-MM".
function monthRange(period: string): { gte: Date; lt: Date } {
  const [y, m] = period.split('-').map(Number);
  return { gte: new Date(y!, m! - 1, 1), lt: new Date(y!, m!, 1) };
}

const router = Router();
router.use(authenticate);

// Lista metas do período com progresso calculado (ganhas fechadas no mês).
router.get('/', asyncHandler(async (req, res) => {
  const period = (req.query.period as string) ?? new Date().toISOString().slice(0, 7);
  const goals = await prisma.goal.findMany({
    where: { period },
    include: { user: { select: { id: true, name: true } } },
  });
  const range = monthRange(period);

  const withProgress = await Promise.all(
    goals.map(async (g) => {
      const where: Prisma.DealWhereInput = {
        status: 'WON',
        closedAt: range,
        ...(g.userId ? { ownerId: g.userId } : {}),
      };
      const agg = await prisma.deal.aggregate({ where, _count: true, _sum: { amountCents: true } });
      const actual = g.metric === 'WON_VALUE' ? (agg._sum.amountCents ?? 0) : agg._count;
      return {
        ...g,
        actual,
        percent: g.target > 0 ? Math.min(100, Math.round((actual / g.target) * 100)) : 0,
      };
    }),
  );
  res.json({ period, goals: withProgress });
}));

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const { period, metric, target, userId } = req.body;
    // Garante uma meta por (userId, period, metric): remove a anterior e recria.
    // (Evita as peculiaridades de UNIQUE com NULL para metas de time.)
    const goal = await prisma.$transaction(async (tx) => {
      await tx.goal.deleteMany({ where: { period, metric, userId: userId ?? null } });
      return tx.goal.create({ data: { period, metric, target, userId: userId ?? null } });
    });
    res.status(201).json(goal);
  }),
);

router.delete('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  await prisma.goal.delete({ where: { id: req.params.id! } });
  res.status(204).send();
}));

export default router;
