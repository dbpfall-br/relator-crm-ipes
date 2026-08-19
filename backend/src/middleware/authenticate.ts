import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';

// Exige um Bearer token válido. Popula req.user.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Token de acesso ausente');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw HttpError.unauthorized('Token de acesso inválido ou expirado');
  }
}

// Restringe a rota a determinados papéis (ex.: authorize('ADMIN', 'MANAGER')).
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw HttpError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw HttpError.forbidden('Seu papel não permite esta ação');
    }
    next();
  };
}
