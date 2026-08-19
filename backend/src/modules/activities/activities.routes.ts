import { Router } from 'express';
import * as controller from './activities.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  completeActivitySchema,
  createActivitySchema,
  idParam,
  listActivitiesQuerySchema,
  updateActivitySchema,
} from './activities.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listActivitiesQuerySchema }), asyncHandler(controller.list));
router.get('/tasks', asyncHandler(controller.myTasks)); // painel de tarefas do usuário
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.getById));
router.post('/', validate({ body: createActivitySchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateActivitySchema }),
  asyncHandler(controller.update),
);
router.post(
  '/:id/complete',
  validate({ params: idParam, body: completeActivitySchema }),
  asyncHandler(controller.complete),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
