import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';
import { validateValues } from '../custom-fields/custom-fields.service.js';
import type {
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from './contacts.schema.js';

export async function list(query: ListContactsQuery) {
  const where: Prisma.ContactWhereInput = {
    AND: [
      query.companyId ? { companyId: query.companyId } : {},
      query.q
        ? {
            OR: [
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { firstName: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getById(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      deals: { include: { stage: true } },
    },
  });
  if (!contact) throw HttpError.notFound('Contato não encontrado');
  return contact;
}

export async function create(user: AccessTokenPayload, input: CreateContactInput) {
  await validateValues('CONTACT', input.customFields);
  return prisma.contact.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      companyId: input.companyId,
      ownerId: input.ownerId ?? user.sub,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function update(id: string, input: UpdateContactInput) {
  if (input.customFields !== undefined) await validateValues('CONTACT', input.customFields, { partial: true });
  const data: Prisma.ContactUpdateInput = {
    ...(input.firstName !== undefined && { firstName: input.firstName }),
    ...(input.lastName !== undefined && { lastName: input.lastName }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
    ...(input.customFields !== undefined && {
      customFields: input.customFields as Prisma.InputJsonValue,
    }),
    ...(input.companyId !== undefined && {
      company: input.companyId ? { connect: { id: input.companyId } } : { disconnect: true },
    }),
    ...(input.ownerId !== undefined && { owner: { connect: { id: input.ownerId } } }),
  };
  return prisma.contact.update({ where: { id }, data });
}

export async function remove(id: string) {
  await prisma.contact.delete({ where: { id } });
}
