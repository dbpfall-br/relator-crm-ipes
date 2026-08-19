import { Router } from 'express';
import * as controller from './stages.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import {
  createStageSchema,
  idParam,
  listStagesQuerySchema,
  reorderStagesSchema,
  updateStageSchema,
} from './stages.schema.js';

const router = Router();
router.use(authenticate);

// Leitura: qualquer usuário autenticado.
router.get('/', validate({ query: listStagesQuerySchema }), asyncHandler(controller.list));

// Alterar a estrutura do funil é ação de gestão → ADMIN ou MANAGER.
router.post('/', authorize('ADMIN', 'MANAGER'), validate({ body: createStageSchema }), asyncHandler(controller.create));
router.post(
  '/reorder',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: reorderStagesSchema }),
  asyncHandler(controller.reorder),
);
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam, body: updateStageSchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam }),
  asyncHandler(controller.remove),
);

export default router;
