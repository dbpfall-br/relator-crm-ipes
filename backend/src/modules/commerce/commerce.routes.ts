import { Router } from 'express';
import { z } from 'zod';
import * as service from './commerce.service.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';

const user = (req: import('express').Request) => {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
};

const addItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    description: z.string().min(1).optional(),
    quantity: z.number().int().positive().default(1),
    unitPriceCents: z.number().int().nonnegative().optional(),
  })
  .refine((d) => d.productId || d.description, { message: 'Informe um produto ou descrição' });

const createProposalSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  intro: z.string().optional(),
});

const statusSchema = z.object({ status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']) });

// Itens e propostas aninhados na negociação (mergeParams p/ acessar :dealId).
export const dealCommerceRouter = Router({ mergeParams: true });
dealCommerceRouter.use(authenticate);

dealCommerceRouter.get('/items', asyncHandler(async (req, res) => {
  res.json(await service.listItems(req.params.dealId!, user(req)));
}));
dealCommerceRouter.post('/items', validate({ body: addItemSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await service.addItem(req.params.dealId!, user(req), req.body));
}));
dealCommerceRouter.delete('/items/:itemId', asyncHandler(async (req, res) => {
  await service.removeItem(req.params.dealId!, req.params.itemId!, user(req));
  res.status(204).send();
}));

dealCommerceRouter.get('/proposals', asyncHandler(async (req, res) => {
  res.json(await service.listProposals(req.params.dealId!, user(req)));
}));
dealCommerceRouter.post('/proposals', validate({ body: createProposalSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createProposal(req.params.dealId!, user(req), req.body));
}));

// Propostas (nível superior): status + visualização pública.
export const proposalsRouter = Router();

// Público (sem autenticação) — link compartilhável com o cliente.
proposalsRouter.get('/public/:token', asyncHandler(async (req, res) => {
  res.json(await service.getPublicProposal(req.params.token!));
}));

proposalsRouter.patch('/:id/status', authenticate, validate({ body: statusSchema }), asyncHandler(async (req, res) => {
  res.json(await service.updateProposalStatus(req.params.id!, user(req), req.body.status));
}));
