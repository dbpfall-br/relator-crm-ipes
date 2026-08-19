import type { Request, Response } from 'express';
import * as service from './users.service.js';
import { HttpError } from '../../utils/http-error.js';

function requesterId(req: Request): string {
  if (!req.user) throw HttpError.unauthorized();
  return req.user.sub;
}

export async function list(_req: Request, res: Response) {
  res.json(await service.list());
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(req.body));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id!, requesterId(req), req.body));
}
export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id!, requesterId(req));
  res.status(204).send();
}
