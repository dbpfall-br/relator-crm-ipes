import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  domain: z.string().optional(),
  industry: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url('URL inválida').optional(),
  ownerId: z.string().uuid().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const updateCompanySchema = createCompanySchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export const listCompaniesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
