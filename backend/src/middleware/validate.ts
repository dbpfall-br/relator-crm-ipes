import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { HttpError } from '../utils/http-error.js';

type Schemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

// Valida body/params/query com Zod e substitui pelos dados já parseados/tipados.
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw HttpError.badRequest('Dados de entrada inválidos', err.flatten());
      }
      throw err;
    }
  };
}
