import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { CreateUserInput, UpdateUserInput } from './users.schema.js';

const BCRYPT_ROUNDS = 12;

// Seleção pública — nunca retorna passwordHash.
const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  managerId: true,
  createdAt: true,
  _count: { select: { ownedDeals: true, activities: true } },
} satisfies Prisma.UserSelect;

export async function list() {
  return prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: publicSelect });
}

export async function create(input: CreateUserInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw HttpError.conflict('E-mail já cadastrado');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      managerId: input.managerId ?? null,
    },
    select: publicSelect,
  });
}

export async function update(id: string, requesterId: string, input: UpdateUserInput) {
  // Um admin não pode rebaixar ou desativar a si mesmo (evita perder acesso).
  if (id === requesterId && (input.role !== undefined || input.isActive === false)) {
    throw HttpError.badRequest('Você não pode alterar seu próprio papel ou desativar sua conta');
  }
  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.managerId !== undefined && { managerId: input.managerId }),
    },
    select: publicSelect,
  });
}

export async function remove(id: string, requesterId: string) {
  if (id === requesterId) throw HttpError.badRequest('Você não pode excluir a própria conta');

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, _count: { select: { ownedDeals: true, activities: true } } },
  });
  if (!user) throw HttpError.notFound('Usuário não encontrado');

  // Exclusão é bloqueada se o usuário possui registros vinculados (deals/atividades),
  // pois apagá-lo deixaria dados órfãos. Oriente a desativar (isActive=false).
  const { ownedDeals, activities } = user._count;
  if (ownedDeals > 0 || activities > 0) {
    throw HttpError.conflict(
      `Este usuário possui ${ownedDeals} negociação(ões) e ${activities} atividade(s). ` +
        'Reatribua-as ou desative o usuário (em vez de excluir).',
    );
  }

  await prisma.user.delete({ where: { id } });
}
