import { Router } from 'express';
import * as controller from './webhooks.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { createWebhookSchema, idParam, updateWebhookSchema } from './webhooks.schema.js';

const router = Router();

// Webhooks são configuração sensível — restrito a ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(controller.list));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.getById));
router.post('/', validate({ body: createWebhookSchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateWebhookSchema }),
  asyncHandler(controller.update),
);
router.post('/:id/test', validate({ params: idParam }), asyncHandler(controller.test));
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
