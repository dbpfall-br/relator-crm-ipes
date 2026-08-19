import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid('ID inválido') });

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES']).default('SALES'),
  managerId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'SALES']).optional(),
    isActive: z.boolean().optional(),
    managerId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envie ao menos um campo' });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
