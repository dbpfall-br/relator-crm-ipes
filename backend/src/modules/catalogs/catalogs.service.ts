import { prisma } from '../../lib/prisma.js';

// Catálogos configuráveis simples usados como listas de seleção em Negociações.

export const lossReasons = {
  list: () => prisma.lossReason.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
  create: (label: string) => prisma.lossReason.create({ data: { label } }),
  update: (id: string, data: { label?: string; isActive?: boolean; position?: number }) =>
    prisma.lossReason.update({ where: { id }, data }),
  remove: (id: string) => prisma.lossReason.delete({ where: { id } }),
};

export const sources = {
  list: () => prisma.source.findMany({ orderBy: { createdAt: 'asc' } }),
  create: (label: string) => prisma.source.create({ data: { label } }),
  remove: (id: string) => prisma.source.delete({ where: { id } }),
};

export const campaigns = {
  list: () => prisma.campaign.findMany({ orderBy: { createdAt: 'asc' } }),
  create: (label: string) => prisma.campaign.create({ data: { label } }),
  remove: (id: string) => prisma.campaign.delete({ where: { id } }),
};
