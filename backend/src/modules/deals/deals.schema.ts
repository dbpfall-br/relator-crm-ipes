import { z } from 'zod';

const uuid = z.string().uuid('ID inválido');

export const dealIdParam = z.object({ id: uuid });

const qualification = z.enum(['NONE', 'COLD', 'WARM', 'HOT']);

export const createDealSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  amountCents: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default('BRL'),
  expectedCloseDate: z.coerce.date().optional(),
  pipelineId: uuid.optional(), // se omitido, usa o pipeline padrão
  stageId: uuid.optional(), // se omitido, usa a 1ª etapa do pipeline
  ownerId: uuid.optional(), // se omitido, usa o usuário autenticado
  contactId: uuid.optional(),
  companyId: uuid.optional(),
  sourceId: uuid.optional(),
  campaignId: uuid.optional(),
  qualification: qualification.optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateDealSchema = z
  .object({
    title: z.string().min(1).optional(),
    amountCents: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    expectedCloseDate: z.coerce.date().nullable().optional(),
    contactId: uuid.nullable().optional(),
    companyId: uuid.nullable().optional(),
    ownerId: uuid.optional(),
    sourceId: uuid.nullable().optional(),
    campaignId: uuid.nullable().optional(),
    qualification: qualification.optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie ao menos um campo para atualizar',
  });

// Marcar como perdida exige o motivo (RD Station-style).
export const loseDealSchema = z.object({
  lossReasonId: uuid.optional(),
});

// Mover no Kanban: nova etapa + posição vertical dentro da coluna.
export const moveDealSchema = z.object({
  stageId: uuid,
  position: z.number().int().nonnegative().default(0),
});

export const listDealsQuerySchema = z.object({
  pipelineId: uuid.optional(),
  stageId: uuid.optional(),
  ownerId: uuid.optional(),
  companyId: uuid.optional(),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  q: z.string().optional(), // busca por título
  createdFrom: z.coerce.date().optional(), // período (por data de criação)
  createdTo: z.coerce.date().optional(),
  // "true" → apenas negociações SEM tarefa em aberto (follow-up esquecido)
  withoutTask: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(['created', 'value', 'closeDate']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;
