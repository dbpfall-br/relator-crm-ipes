import { Router } from 'express';
import * as controller from './contacts.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createContactSchema,
  idParam,
  listContactsQuerySchema,
  updateContactSchema,
} from './contacts.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listContactsQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.getById));
router.post('/', validate({ body: createContactSchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateContactSchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
