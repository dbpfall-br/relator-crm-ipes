import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  code: z.string().optional(),
  unitPriceCents: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});
const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().nullable().optional(),
    unitPriceCents: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.product.findMany({ orderBy: { name: 'asc' } }));
  }),
);

router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.product.create({ data: req.body }));
  }),
);

router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam, body: updateSchema }),
  asyncHandler(async (req, res) => {
    res.json(await prisma.product.update({ where: { id: req.params.id! }, data: req.body }));
  }),
);

router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id! } });
    res.status(204).send();
  }),
);

export default router;
