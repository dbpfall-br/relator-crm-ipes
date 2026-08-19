import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app: Express = createApp();

// Cria o pipeline padrão + etapas (equivalente ao seed), necessário p/ criar deals.
export async function seedDefaultPipeline() {
  return prisma.pipeline.create({
    data: {
      name: 'Pipeline de Testes',
      isDefault: true,
      stages: {
        create: [
          { name: 'Prospecção', position: 0, probability: 10 },
          { name: 'Qualificação', position: 1, probability: 30 },
          { name: 'Fechamento', position: 2, probability: 100 },
        ],
      },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  });
}

interface AuthUser {
  token: string;
  userId: string;
  email: string;
}

// Registra um usuário via API e devolve o token de acesso já pronto p/ uso.
export async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string; role: string }> = {},
): Promise<AuthUser> {
  const body = {
    name: overrides.name ?? 'Teste',
    email: overrides.email ?? `user_${Math.random().toString(36).slice(2)}@test.dev`,
    password: overrides.password ?? 'senha12345',
    ...(overrides.role ? { role: overrides.role } : {}),
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { token: res.body.accessToken, userId: res.body.user.id, email: body.email };
}

// Atalho: header Authorization Bearer.
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
