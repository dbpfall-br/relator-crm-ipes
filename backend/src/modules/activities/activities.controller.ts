import type { Request, Response } from 'express';
import * as service from './activities.service.js';
import { HttpError } from '../../utils/http-error.js';
import type { ListActivitiesQuery } from './activities.schema.js';

function currentUser(req: Request) {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as unknown as ListActivitiesQuery));
}
export async function myTasks(req: Request, res: Response) {
  res.json(await service.myTasks(currentUser(req)));
}
export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id!));
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(currentUser(req), req.body));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id!, req.body));
}
export async function complete(req: Request, res: Response) {
  res.json(await service.complete(req.params.id!, req.body?.note));
}
export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id!);
  res.status(204).send();
}
