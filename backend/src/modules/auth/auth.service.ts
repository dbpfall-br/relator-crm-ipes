import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

// Regra de negócio de autenticação isolada da camada HTTP (controller).
// Isso permite reusar o mesmo serviço a partir de scripts, CLIs ou agentes de IA.

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Hash determinístico do refresh token para armazenar/comparar no banco
// (nunca guardamos o token em texto puro).
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES';
};

function toPublicUser(u: {
  id: string;
  name: string;
  email: string;
  role: PublicUser['role'];
}): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

async function issueTokens(user: PublicUser) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw HttpError.conflict('E-mail já cadastrado');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? 'SALES',
      managerId: input.managerId,
    },
  });

  const publicUser = toPublicUser(user);
  const tokens = await issueTokens(publicUser);
  return { user: publicUser, ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Mensagem genérica evita revelar se o e-mail existe (enumeration).
  if (!user || !user.isActive) throw HttpError.unauthorized('Credenciais inválidas');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw HttpError.unauthorized('Credenciais inválidas');

  const publicUser = toPublicUser(user);
  const tokens = await issueTokens(publicUser);
  return { user: publicUser, ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw HttpError.unauthorized('Refresh token inválido ou expirado');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw HttpError.unauthorized('Sessão expirada, faça login novamente');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw HttpError.unauthorized();

  // Rotação: revoga o token usado e emite um novo par (mitiga replay).
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const publicUser = toPublicUser(user);
  const tokens = await issueTokens(publicUser);
  return { user: publicUser, ...tokens };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, managerId: true },
  });
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  return user;
}
