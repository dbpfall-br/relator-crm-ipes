import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { dealVisibilityFilter } from '../../utils/visibility.js';
import { HttpError } from '../../utils/http-error.js';

const router = Router();
router.use(authenticate);

// ---- Leitura: qualquer usuário (para preencher no deal) ----
router.get('/', asyncHandler(async (_req, res) => {
  res.json(
    await prisma.questionnaire.findMany({
      where: { isActive: true },
      include: { questions: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    }),
  );
}));

// ---- Respostas por negociação ----
async function assertDealAccess(dealId: string, req: import('express').Request) {
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id: dealId }, await dealVisibilityFilter(req.user!)] },
    select: { id: true },
  });
  if (!deal) throw HttpError.notFound('Negociação não encontrada');
}

router.get('/deal/:dealId/responses', asyncHandler(async (req, res) => {
  await assertDealAccess(req.params.dealId!, req);
  res.json(await prisma.dealQuestionnaireResponse.findMany({ where: { dealId: req.params.dealId! } }));
}));

const respondSchema = z.object({ answers: z.record(z.string(), z.unknown()) });
router.put(
  '/:id/deal/:dealId',
  validate({ body: respondSchema }),
  asyncHandler(async (req, res) => {
    await assertDealAccess(req.params.dealId!, req);
    const data = { answers: req.body.answers as Prisma.InputJsonValue };
    const result = await prisma.dealQuestionnaireResponse.upsert({
      where: { dealId_questionnaireId: { dealId: req.params.dealId!, questionnaireId: req.params.id! } },
      create: { dealId: req.params.dealId!, questionnaireId: req.params.id!, ...data },
      update: data,
    });
    res.json(result);
  }),
);

// ---- Gestão (ADMIN) ----
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: z.object({ name: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.questionnaire.create({ data: { name: req.body.name } }));
  }),
);

router.delete('/:id', authorize('ADMIN'), asyncHandler(async (req, res) => {
  await prisma.questionnaire.delete({ where: { id: req.params.id! } });
  res.status(204).send();
}));

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['TEXT', 'BOOLEAN', 'SELECT']).default('TEXT'),
  options: z.array(z.string()).default([]),
});
router.post(
  '/:id/questions',
  authorize('ADMIN'),
  validate({ body: questionSchema }),
  asyncHandler(async (req, res) => {
    const count = await prisma.questionnaireQuestion.count({ where: { questionnaireId: req.params.id! } });
    res.status(201).json(
      await prisma.questionnaireQuestion.create({
        data: { questionnaireId: req.params.id!, position: count, ...req.body },
      }),
    );
  }),
);

router.delete('/questions/:questionId', authorize('ADMIN'), asyncHandler(async (req, res) => {
  await prisma.questionnaireQuestion.delete({ where: { id: req.params.questionId! } });
  res.status(204).send();
}));

export default router;
