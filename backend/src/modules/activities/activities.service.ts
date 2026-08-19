import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import { publishToUser } from '../../events/publish.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';
import type {
  CreateActivityInput,
  ListActivitiesQuery,
  UpdateActivityInput,
} from './activities.schema.js';

const activityInclude = {
  owner: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ActivityInclude;

export async function list(query: ListActivitiesQuery) {
  const where: Prisma.ActivityWhereInput = {
    AND: [
      query.dealId ? { dealId: query.dealId } : {},
      query.contactId ? { contactId: query.contactId } : {},
      query.type ? { type: query.type } : {},
      query.done !== undefined ? { done: query.done } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: 'desc' }, // timeline: mais recente primeiro
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.activity.count({ where }),
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

// Painel de tarefas do usuário: atrasadas, de hoje e futuras (apenas TASK em aberto).
export async function myTasks(user: AccessTokenPayload) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const base: Prisma.ActivityWhereInput = {
    ownerId: user.sub,
    done: false,
    dueAt: { not: null },
  };

  const [overdue, today, upcoming] = await Promise.all([
    prisma.activity.findMany({
      where: { ...base, dueAt: { lt: startOfDay } },
      include: activityInclude,
      orderBy: { dueAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: { ...base, dueAt: { gte: startOfDay, lte: endOfDay } },
      include: activityInclude,
      orderBy: { dueAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: { ...base, dueAt: { gt: endOfDay } },
      include: activityInclude,
      orderBy: { dueAt: 'asc' },
    }),
  ]);

  return { overdue, today, upcoming };
}

export async function getById(id: string) {
  const activity = await prisma.activity.findUnique({ where: { id }, include: activityInclude });
  if (!activity) throw HttpError.notFound('Atividade não encontrada');
  return activity;
}

export async function create(user: AccessTokenPayload, input: CreateActivityInput) {
  const activity = await prisma.activity.create({
    data: {
      type: input.type,
      subject: input.subject,
      notes: input.notes,
      dueAt: input.dueAt,
      done: input.done ?? false,
      completedAt: input.done ? new Date() : null,
      ownerId: input.ownerId ?? user.sub,
      dealId: input.dealId,
      contactId: input.contactId,
    },
    include: activityInclude,
  });

  publishToUser(activity.ownerId, 'activity:created', activity);
  return activity;
}

export async function update(id: string, input: UpdateActivityInput) {
  const data: Prisma.ActivityUpdateInput = {
    ...(input.type !== undefined && { type: input.type }),
    ...(input.subject !== undefined && { subject: input.subject }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.dueAt !== undefined && { dueAt: input.dueAt }),
    ...(input.done !== undefined && {
      done: input.done,
      completedAt: input.done ? new Date() : null,
    }),
  };
  return prisma.activity.update({ where: { id }, data, include: activityInclude });
}

// Marca uma tarefa como concluída. Se vier uma anotação, gera um segundo
// evento (tipo NOTE) vinculado à mesma negociação/contato — igual ao RD Station:
// a conclusão e o resultado da interação ficam ambos registrados na timeline.
export async function complete(id: string, note?: string) {
  const activity = await prisma.activity.update({
    where: { id },
    data: { done: true, completedAt: new Date() },
    include: activityInclude,
  });

  if (note && note.trim()) {
    const noteActivity = await prisma.activity.create({
      data: {
        type: 'NOTE',
        subject: `Anotação: ${activity.subject}`,
        notes: note.trim(),
        done: true,
        completedAt: new Date(),
        ownerId: activity.ownerId,
        dealId: activity.dealId,
        contactId: activity.contactId,
      },
      include: activityInclude,
    });
    publishToUser(activity.ownerId, 'activity:created', noteActivity);
  }

  return activity;
}

export async function remove(id: string) {
  await prisma.activity.delete({ where: { id } });
}
