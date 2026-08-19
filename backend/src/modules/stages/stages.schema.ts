import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const createStageSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  probability: z.number().int().min(0).max(100).default(0),
  pipelineId: z.string().uuid().optional(), // default = pipeline padrão
});

export const updateStageSchema = z
  .object({
    name: z.string().min(1).optional(),
    probability: z.number().int().min(0).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export const reorderStagesSchema = z.object({
  pipelineId: z.string().uuid().optional(),
  orderedIds: z.array(z.string().uuid()).min(1, 'Informe a nova ordem das etapas'),
});

export const listStagesQuerySchema = z.object({
  pipelineId: z.string().uuid().optional(),
});

export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
