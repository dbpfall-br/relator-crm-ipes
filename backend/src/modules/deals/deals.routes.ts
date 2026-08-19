import { Router } from 'express';
import * as controller from './deals.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createDealSchema,
  dealIdParam,
  listDealsQuerySchema,
  loseDealSchema,
  moveDealSchema,
  updateDealSchema,
} from './deals.schema.js';

const router = Router();

// Todas as rotas de deals exigem autenticação.
router.use(authenticate);

router.get('/', validate({ query: listDealsQuerySchema }), asyncHandler(controller.list));
router.get('/board', asyncHandler(controller.board));
router.get('/export.csv', validate({ query: listDealsQuerySchema }), asyncHandler(controller.exportCsv));
router.get('/:id', validate({ params: dealIdParam }), asyncHandler(controller.getById));
router.post('/', validate({ body: createDealSchema }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: dealIdParam, body: updateDealSchema }),
  asyncHandler(controller.update),
);
router.post(
  '/:id/move',
  validate({ params: dealIdParam, body: moveDealSchema }),
  asyncHandler(controller.move),
);
router.post('/:id/convert', validate({ params: dealIdParam }), asyncHandler(controller.convert));
router.post('/:id/win', validate({ params: dealIdParam }), asyncHandler(controller.win));
router.post(
  '/:id/lose',
  validate({ params: dealIdParam, body: loseDealSchema }),
  asyncHandler(controller.lose),
);
router.delete('/:id', validate({ params: dealIdParam }), asyncHandler(controller.remove));

export default router;
