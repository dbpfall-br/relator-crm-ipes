import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

const activityType = z.enum([
  'CALL',
  'EMAIL',
  'MEETING',
  'NOTE',
  'TASK',
  'LUNCH',
  'VISIT',
  'WHATSAPP',
]);

// Body opcional ao concluir uma tarefa: gera uma anotação vinculada.
export const completeActivitySchema = z.object({
  note: z.string().optional(),
});

export const createActivitySchema = z
  .object({
    type: activityType,
    subject: z.string().min(1, 'Assunto obrigatório'),
    notes: z.string().optional(),
    dueAt: z.coerce.date().optional(), // tarefa futura (follow-up)
    done: z.boolean().optional(),
    dealId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
  })
  .refine((d) => d.dealId || d.contactId, {
    message: 'Vincule a atividade a um deal ou a um contato',
  });

export const updateActivitySchema = z
  .object({
    type: activityType.optional(),
    subject: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    done: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export const listActivitiesQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  type: activityType.optional(),
  done: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
