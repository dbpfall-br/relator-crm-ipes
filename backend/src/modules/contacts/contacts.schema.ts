import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'Nome obrigatório'),
  lastName: z.string().optional(),
  email: z.string().email('E-mail inválido').optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export const listContactsQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
