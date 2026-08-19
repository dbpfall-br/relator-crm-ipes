import { Router } from 'express';
import * as service from './pipelines.service.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { createPipelineSchema, idParam, updatePipelineSchema } from './pipelines.schema.js';

const router = Router();
router.use(authenticate);

// Leitura: qualquer usuário (para o seletor de funil).
router.get('/', asyncHandler(async (_req, res) => res.json(await service.list())));

// Estrutura de funis é ação de gestão.
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createPipelineSchema }),
  asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body))),
);
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam, body: updatePipelineSchema }),
  asyncHandler(async (req, res) => res.json(await service.update(req.params.id!, req.body))),
);
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.remove(req.params.id!);
    res.status(204).send();
  }),
);

export default router;
