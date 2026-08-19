import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

// Eventos de domínio disponíveis para assinatura.
export const WEBHOOK_EVENTS = [
  'deal.created',
  'deal.updated',
  'deal.moved',
  'deal.deleted',
  'deal.won',
  'deal.lost',
  'activity.created',
] as const;

export const createWebhookSchema = z.object({
  url: z.string().url('URL inválida'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).default([]), // [] = todos
  description: z.string().optional(),
  secret: z.string().min(8).optional(), // se omitido, é gerado
  isActive: z.boolean().default(true),
});

export const updateWebhookSchema = z
  .object({
    url: z.string().url().optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
