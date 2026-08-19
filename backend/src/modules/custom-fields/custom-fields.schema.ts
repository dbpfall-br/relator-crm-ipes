import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const ENTITIES = ['DEAL', 'COMPANY', 'CONTACT'] as const;
export const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT'] as const;

export const listQuerySchema = z.object({
  entity: z.enum(ENTITIES).optional(),
});

export const createCustomFieldSchema = z
  .object({
    entity: z.enum(ENTITIES),
    label: z.string().min(1, 'Rótulo obrigatório'),
    key: z
      .string()
      .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _')
      .optional(),
    type: z.enum(FIELD_TYPES),
    options: z.array(z.string().min(1)).default([]),
    required: z.boolean().default(false),
    position: z.number().int().min(0).default(0),
  })
  .refine((d) => !['SELECT', 'MULTISELECT'].includes(d.type) || d.options.length > 0, {
    message: 'Campos de seleção precisam de ao menos uma opção',
    path: ['options'],
  });

export const updateCustomFieldSchema = z
  .object({
    label: z.string().min(1).optional(),
    options: z.array(z.string().min(1)).optional(),
    required: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
