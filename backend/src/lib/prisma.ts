import { PrismaClient } from '@prisma/client';
import { env, isProd } from '../config/env.js';

// Singleton do Prisma — evita esgotar o pool de conexões em hot-reload (dev).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log detalhado apenas em desenvolvimento (test/prod ficam quietos).
    log: env.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
