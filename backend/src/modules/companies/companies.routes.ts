import { Router } from 'express';
import * as controller from './companies.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createCompanySchema,
  idParam,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from './companies.schema.js';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listCompaniesQuerySchema }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.getById));
router.get('/:id/dashboard', validate({ params: idParam }), asyncHandler(controller.dashboard));
router.post('/', validate({ body: createCompanySchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateCompanySchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
