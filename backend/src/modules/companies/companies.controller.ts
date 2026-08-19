import type { Request, Response } from 'express';
import * as service from './companies.service.js';
import { HttpError } from '../../utils/http-error.js';
import type { ListCompaniesQuery } from './companies.schema.js';

function currentUser(req: Request) {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as unknown as ListCompaniesQuery));
}
export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id!));
}
export async function dashboard(req: Request, res: Response) {
  res.json(await service.getDashboard(req.params.id!));
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(currentUser(req), req.body));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id!, req.body));
}
export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id!);
  res.status(204).send();
}
