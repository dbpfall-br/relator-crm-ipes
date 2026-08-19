import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';
import { validateValues } from '../custom-fields/custom-fields.service.js';
import type {
  CreateCompanyInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from './companies.schema.js';

export async function list(query: ListCompaniesQuery) {
  const where: Prisma.CompanyWhereInput = query.q
    ? { name: { contains: query.q, mode: 'insensitive' } }
    : {};

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { contacts: true, deals: true } } },
    }),
    prisma.company.count({ where }),
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
  const company = await prisma.company.findUnique({
    where: { id },
    include: { contacts: true, deals: { include: { stage: true } } },
  });
  if (!company) throw HttpError.notFound('Empresa não encontrada');
  return company;
}

export async function create(user: AccessTokenPayload, input: CreateCompanyInput) {
  await validateValues('COMPANY', input.customFields);
  return prisma.company.create({
    data: {
      name: input.name,
      domain: input.domain,
      industry: input.industry,
      phone: input.phone,
      website: input.website,
      ownerId: input.ownerId ?? user.sub,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function update(id: string, input: UpdateCompanyInput) {
  if (input.customFields !== undefined) await validateValues('COMPANY', input.customFields, { partial: true });
  const data: Prisma.CompanyUpdateInput = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.domain !== undefined && { domain: input.domain }),
    ...(input.industry !== undefined && { industry: input.industry }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.website !== undefined && { website: input.website }),
    ...(input.customFields !== undefined && {
      customFields: input.customFields as Prisma.InputJsonValue,
    }),
    ...(input.ownerId !== undefined && { owner: { connect: { id: input.ownerId } } }),
  };
  return prisma.company.update({ where: { id }, data });
}

export async function remove(id: string) {
  await prisma.company.delete({ where: { id } });
}

// Dashboard agregado da empresa (visão de "conta"): métricas consolidadas de
// todas as negociações + histórico unificado de atividades. Estilo RD Station.
export async function getDashboard(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } },
    },
  });
  if (!company) throw HttpError.notFound('Empresa não encontrada');

  const deals = await prisma.deal.findMany({
    where: { companyId: id },
    include: {
      stage: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sum = (list: typeof deals) => list.reduce((acc, d) => acc + d.amountCents, 0);
  const open = deals.filter((d) => d.status === 'OPEN');
  const won = deals.filter((d) => d.status === 'WON');
  const lost = deals.filter((d) => d.status === 'LOST');

  // Tempo médio até a venda (dias entre criação e fechamento das ganhas).
  const durations = won
    .filter((d) => d.closedAt)
    .map((d) => (d.closedAt!.getTime() - d.createdAt.getTime()) / 86_400_000);
  const avgDaysToWin = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  // Histórico unificado: atividades de todas as negociações da empresa.
  const timeline = await prisma.activity.findMany({
    where: { deal: { companyId: id } },
    include: {
      owner: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return {
    company: {
      id: company.id,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      phone: company.phone,
      website: company.website,
      contacts: company.contacts,
      customFields: company.customFields,
    },
    metrics: {
      openValueCents: sum(open),
      wonValueCents: sum(won),
      lostValueCents: sum(lost),
      openCount: open.length,
      wonCount: won.length,
      lostCount: lost.length,
      avgTicketCents: won.length ? Math.round(sum(won) / won.length) : 0,
      avgDaysToWin,
    },
    deals,
    timeline,
  };
}
