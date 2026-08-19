import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import { dispatchWebhook } from './webhook.dispatcher.js';
import type { CreateWebhookInput, UpdateWebhookInput } from './webhooks.schema.js';

export async function list() {
  return prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { deliveries: true } } },
  });
}

export async function getById(id: string) {
  const webhook = await prisma.webhook.findUnique({
    where: { id },
    include: {
      deliveries: { orderBy: { createdAt: 'desc' }, take: 20 }, // últimas entregas
    },
  });
  if (!webhook) throw HttpError.notFound('Webhook não encontrado');
  return webhook;
}

export async function create(input: CreateWebhookInput) {
  // Segredo forte gerado quando não informado — mostrado ao criar.
  const secret = input.secret ?? randomBytes(24).toString('hex');
  return prisma.webhook.create({
    data: {
      url: input.url,
      events: input.events,
      description: input.description,
      isActive: input.isActive,
      secret,
    },
  });
}

export async function update(id: string, input: UpdateWebhookInput) {
  return prisma.webhook.update({
    where: { id },
    data: {
      ...(input.url !== undefined && { url: input.url }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function remove(id: string) {
  await prisma.webhook.delete({ where: { id } });
}

// Dispara um evento de teste (ping) para validar a configuração do endpoint.
export async function test(id: string) {
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook) throw HttpError.notFound('Webhook não encontrado');
  dispatchWebhook('webhook.test', {
    message: 'Ping de teste do Relator CRM',
    webhookId: id,
  });
  return { ok: true };
}
