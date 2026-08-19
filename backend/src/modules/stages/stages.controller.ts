import type { Request, Response } from 'express';
import * as service from './stages.service.js';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query.pipelineId as string | undefined));
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
export async function reorder(req: Request, res: Response) {
  res.json(await service.reorder(req.body));
}
