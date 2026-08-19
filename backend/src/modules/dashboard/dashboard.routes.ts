import { Router } from 'express';
import * as service from './dashboard.service.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';

const router = Router();
router.use(authenticate);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized();
    res.json(await service.summary(req.user));
  }),
);

export default router;
