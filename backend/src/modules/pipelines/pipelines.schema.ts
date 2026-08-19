import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  kind: z.enum(['SALES', 'LEADS']).default('SALES'),
});

export const updatePipelineSchema = z
  .object({
    name: z.string().min(1).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
