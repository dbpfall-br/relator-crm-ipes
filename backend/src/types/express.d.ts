import type { AccessTokenPayload } from '../utils/jwt.js';

// Adiciona req.user (preenchido pelo middleware de autenticação).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
