import type { NextFunction, Request, Response } from 'express';

// Envolve controllers async e encaminha rejeições ao middleware de erro,
// evitando try/catch repetitivo em cada rota.
type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncController) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
