import type { Request, Response } from 'express';
import * as dealsService from './deals.service.js';
import { HttpError } from '../../utils/http-error.js';
import type { ListDealsQuery } from './deals.schema.js';

function currentUser(req: Request) {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response) {
  const result = await dealsService.listDeals(
    currentUser(req),
    req.query as unknown as ListDealsQuery,
  );
  res.json(result);
}

export async function board(req: Request, res: Response) {
  const pipelineId = req.query.pipelineId as string | undefined;
  const result = await dealsService.getBoard(currentUser(req), pipelineId);
  res.json(result);
}

export async function exportCsv(req: Request, res: Response) {
  const csv = await dealsService.exportDealsCsv(
    currentUser(req),
    req.query as unknown as ListDealsQuery,
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="negociacoes.csv"');
  res.send('﻿' + csv); // BOM p/ acentos abrirem certo no Excel
}

export async function getById(req: Request, res: Response) {
  const result = await dealsService.getDeal(req.params.id!, currentUser(req));
  res.json(result);
}

export async function create(req: Request, res: Response) {
  const result = await dealsService.createDeal(currentUser(req), req.body);
  res.status(201).json(result);
}

export async function update(req: Request, res: Response) {
  const result = await dealsService.updateDeal(req.params.id!, currentUser(req), req.body);
  res.json(result);
}

export async function move(req: Request, res: Response) {
  const result = await dealsService.moveDeal(req.params.id!, currentUser(req), req.body);
  res.json(result);
}

export async function win(req: Request, res: Response) {
  const result = await dealsService.closeDeal(req.params.id!, currentUser(req), true);
  res.json(result);
}

export async function lose(req: Request, res: Response) {
  const result = await dealsService.closeDeal(
    req.params.id!,
    currentUser(req),
    false,
    req.body?.lossReasonId,
  );
  res.json(result);
}

export async function convert(req: Request, res: Response) {
  const result = await dealsService.convertLead(req.params.id!, currentUser(req));
  res.json(result);
}

export async function remove(req: Request, res: Response) {
  await dealsService.deleteDeal(req.params.id!, currentUser(req));
  res.status(204).send();
}
