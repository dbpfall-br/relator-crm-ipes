import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { dealVisibilityFilter } from '../../src/utils/visibility.js';
import type { AccessTokenPayload } from '../../src/utils/jwt.js';

function payload(sub: string, role: AccessTokenPayload['role']): AccessTokenPayload {
  return { sub, role, email: `${sub}@test.dev` };
}

describe('dealVisibilityFilter', () => {
  it('ADMIN → sem restrição (filtro vazio)', async () => {
    const filter = await dealVisibilityFilter(payload('admin-id', 'ADMIN'));
    expect(filter).toEqual({});
  });

  it('SALES → apenas os próprios deals', async () => {
    const filter = await dealVisibilityFilter(payload('sales-id', 'SALES'));
    expect(filter).toEqual({ ownerId: 'sales-id' });
  });

  it('MANAGER → os próprios + os da equipe subordinada', async () => {
    const manager = await prisma.user.create({
      data: { name: 'Gestor', email: 'gestor@test.dev', passwordHash: 'x', role: 'MANAGER' },
    });
    const sub = await prisma.user.create({
      data: {
        name: 'Subordinado',
        email: 'sub@test.dev',
        passwordHash: 'x',
        role: 'SALES',
        managerId: manager.id,
      },
    });

    const filter = await dealVisibilityFilter(payload(manager.id, 'MANAGER'));
    // ownerId IN [manager, subordinado]
    expect(filter).toHaveProperty('ownerId');
    const ids = (filter as { ownerId: { in: string[] } }).ownerId.in;
    expect(ids).toContain(manager.id);
    expect(ids).toContain(sub.id);
  });
});
