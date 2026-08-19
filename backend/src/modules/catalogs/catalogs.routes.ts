import { Router } from 'express';
import { z } from 'zod';
import * as service from './catalogs.service.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const labelBody = z.object({ label: z.string().min(1, 'Rótulo obrigatório') });
const lossUpdateBody = z
  .object({
    label: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

// --------- Motivos de perda ---------
export const lossReasonsRouter = Router();
lossReasonsRouter.use(authenticate);
lossReasonsRouter.get('/', asyncHandler(async (_req, res) => res.json(await service.lossReasons.list())));
lossReasonsRouter.post(
  '/',
  authorize('ADMIN'),
  validate({ body: labelBody }),
  asyncHandler(async (req, res) => res.status(201).json(await service.lossReasons.create(req.body.label))),
);
lossReasonsRouter.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, body: lossUpdateBody }),
  asyncHandler(async (req, res) => res.json(await service.lossReasons.update(req.params.id!, req.body))),
);
lossReasonsRouter.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.lossReasons.remove(req.params.id!);
    res.status(204).send();
  }),
);

// --------- Fontes ---------
export const sourcesRouter = Router();
sourcesRouter.use(authenticate);
sourcesRouter.get('/', asyncHandler(async (_req, res) => res.json(await service.sources.list())));
sourcesRouter.post(
  '/',
  authorize('ADMIN'),
  validate({ body: labelBody }),
  asyncHandler(async (req, res) => res.status(201).json(await service.sources.create(req.body.label))),
);
sourcesRouter.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.sources.remove(req.params.id!);
    res.status(204).send();
  }),
);

// --------- Campanhas ---------
export const campaignsRouter = Router();
campaignsRouter.use(authenticate);
campaignsRouter.get('/', asyncHandler(async (_req, res) => res.json(await service.campaigns.list())));
campaignsRouter.post(
  '/',
  authorize('ADMIN'),
  validate({ body: labelBody }),
  asyncHandler(async (req, res) => res.status(201).json(await service.campaigns.create(req.body.label))),
);
campaignsRouter.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.campaigns.remove(req.params.id!);
    res.status(204).send();
  }),
);
