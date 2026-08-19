import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { formatMoneyCents } from '../../utils/format.js';

const idParam = z.object({ id: z.string().uuid('ID inválido') });
const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['EMAIL', 'PROPOSAL']),
  subject: z.string().optional(),
  body: z.string().min(1),
});
const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    subject: z.string().nullable().optional(),
    body: z.string().min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

// Substitui {{deal.title}}, {{deal.amount}}, {{company.name}}, {{contact.firstName}}, {{owner.name}}.
function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => vars[key] ?? '');
}

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    res.json(await prisma.template.findMany({ where: type ? { type: type as never } : {}, orderBy: { name: 'asc' } }));
  }),
);

// Renderiza um template para uma negociação (para copiar/colar no e-mail).
router.get(
  '/:id/render',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({ where: { id: req.params.id! } });
    if (!template) throw HttpError.notFound('Modelo não encontrado');
    const dealId = req.query.dealId as string | undefined;
    if (!dealId) throw HttpError.badRequest('Informe dealId');

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { company: true, contact: true, owner: true },
    });
    if (!deal) throw HttpError.notFound('Negociação não encontrada');

    const vars: Record<string, string> = {
      'deal.title': deal.title,
      'deal.amount': formatMoneyCents(deal.amountCents, deal.currency),
      'company.name': deal.company?.name ?? '',
      'contact.firstName': deal.contact?.firstName ?? '',
      'contact.lastName': deal.contact?.lastName ?? '',
      'owner.name': deal.owner.name,
    };
    res.json({
      subject: template.subject ? fill(template.subject, vars) : null,
      body: fill(template.body, vars),
    });
  }),
);

router.post('/', authorize('ADMIN', 'MANAGER'), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.template.create({ data: req.body }));
}));
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam, body: updateSchema }), asyncHandler(async (req, res) => {
  res.json(await prisma.template.update({ where: { id: req.params.id! }, data: req.body }));
}));
router.delete('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  await prisma.template.delete({ where: { id: req.params.id! } });
  res.status(204).send();
}));

export default router;
