import { Router } from 'express';
import * as controller from './users.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { createUserSchema, idParam, updateUserSchema } from './users.schema.js';

const router = Router();

// Gestão de usuários é restrita a ADMIN.
router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: createUserSchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateUserSchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
