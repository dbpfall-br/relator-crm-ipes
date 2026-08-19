import { Router } from 'express';
import { z } from 'zod';
import * as service from './reports.service.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';

const closedQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  pipelineId: z.string().uuid().optional(),
});

const router = Router();
router.use(authenticate);

router.get(
  '/live',
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized();
    res.json(await service.live(req.user));
  }),
);

router.get(
  '/closed',
  validate({ query: closedQuery }),
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized();
    res.json(
      await service.closed(req.user, {
        from: req.query.from as unknown as Date | undefined,
        to: req.query.to as unknown as Date | undefined,
        pipelineId: req.query.pipelineId as string | undefined,
      }),
    );
  }),
);

export default router;
