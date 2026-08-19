import type { Request, Response } from 'express';
import type { CustomFieldEntity } from '@prisma/client';
import * as service from './custom-fields.service.js';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query.entity as CustomFieldEntity | undefined));
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
