import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const cfg = z.record(z.string(), z.unknown());

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  trigger: z.enum(['DEAL_CREATED', 'DEAL_MOVED', 'DEAL_WON', 'DEAL_LOST', 'DEAL_CONVERTED']),
  triggerConfig: cfg.default({}),
  action: z.enum(['CREATE_TASK', 'CREATE_NOTE', 'MOVE_STAGE', 'SET_QUALIFICATION']),
  actionConfig: cfg.default({}),
  isActive: z.boolean().default(true),
});
const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    triggerConfig: cfg.optional(),
    actionConfig: cfg.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

const router = Router();
router.use(authenticate, authorize('ADMIN')); // configuração sensível

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await prisma.automationRule.findMany({ orderBy: { createdAt: 'asc' } }));
}));
router.post('/', validate({ body: createSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.automationRule.create({ data: req.body as Prisma.AutomationRuleCreateInput }));
}));
router.patch('/:id', validate({ params: idParam, body: updateSchema }), asyncHandler(async (req, res) => {
  res.json(await prisma.automationRule.update({ where: { id: req.params.id! }, data: req.body }));
}));
router.delete('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await prisma.automationRule.delete({ where: { id: req.params.id! } });
  res.status(204).send();
}));

export default router;
