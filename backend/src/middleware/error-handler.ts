import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http-error.js';
import { isProd } from '../config/env.js';

// Middleware terminal de erros. Deve ser o último `app.use(...)`.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  // Violação de unicidade do Prisma (ex.: e-mail já cadastrado)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: 'Recurso não encontrado' });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: 'Já existe um registro com este valor único' });
    return;
  }

  console.error('[unhandled error]', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    ...(isProd ? {} : { detail: String(err) }),
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada' });
}
