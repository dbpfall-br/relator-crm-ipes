import type { Request, Response } from 'express';
import * as service from './webhooks.service.js';

export async function list(_req: Request, res: Response) {
  res.json(await service.list());
}
export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id!));
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(req.body));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id!, req.body));
}
export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id!);
  res.status(204).send();
}
export async function test(req: Request, res: Response) {
  res.json(await service.test(req.params.id!));
}
