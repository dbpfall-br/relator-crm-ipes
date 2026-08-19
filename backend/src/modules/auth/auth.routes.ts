import { Router } from 'express';
import * as controller from './auth.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
router.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(controller.refresh));
router.post('/logout', validate({ body: refreshSchema }), asyncHandler(controller.logout));
router.get('/me', authenticate, asyncHandler(controller.me));

export default router;
