import { Router } from 'express';
import * as controller from './custom-fields.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import {
  createCustomFieldSchema,
  idParam,
  listQuerySchema,
  updateCustomFieldSchema,
} from './custom-fields.schema.js';

const router = Router();
router.use(authenticate);

// Leitura: qualquer usuário (a UI precisa para renderizar os formulários).
router.get('/', validate({ query: listQuerySchema }), asyncHandler(controller.list));

// Definir a estrutura de campos é ação de administração.
router.post('/', authorize('ADMIN'), validate({ body: createCustomFieldSchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, body: updateCustomFieldSchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
