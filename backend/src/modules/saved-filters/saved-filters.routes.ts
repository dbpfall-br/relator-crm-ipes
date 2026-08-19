import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  query: z.record(z.string(), z.unknown()), // parâmetros de GET /deals
});

const router = Router();
router.use(authenticate);

// Cada usuário só enxerga e gerencia os próprios filtros salvos.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.savedFilter.findMany({
        where: { userId: req.user!.sub },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }),
);

router.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const created = await prisma.savedFilter.create({
      data: {
        name: req.body.name,
        query: req.body.query as Prisma.InputJsonValue,
        userId: req.user!.sub,
      },
    });
    res.status(201).json(created);
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const filter = await prisma.savedFilter.findUnique({ where: { id: req.params.id! } });
    if (!filter || filter.userId !== req.user!.sub) throw HttpError.notFound('Filtro não encontrado');
    await prisma.savedFilter.delete({ where: { id: filter.id } });
    res.status(204).send();
  }),
);

export default router;
