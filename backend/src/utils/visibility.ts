import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { AccessTokenPayload } from './jwt.js';

// Visibilidade de Deals por papel:
//  - ADMIN   → tudo
//  - MANAGER → os próprios + os da equipe subordinada (managerId = ele)
//  - SALES   → apenas os próprios
// Retorna um filtro Prisma reutilizável (Deals e agregações do Dashboard).
export async function dealVisibilityFilter(
  user: AccessTokenPayload,
): Promise<Prisma.DealWhereInput> {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'MANAGER') {
    const team = await prisma.user.findMany({
      where: { managerId: user.sub },
      select: { id: true },
    });
    return { ownerId: { in: [user.sub, ...team.map((t) => t.id)] } };
  }
  return { ownerId: user.sub };
}
