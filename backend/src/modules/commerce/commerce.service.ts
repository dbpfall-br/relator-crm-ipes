import { randomBytes } from 'node:crypto';
import type { Prisma, ProposalStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import { dealVisibilityFilter } from '../../utils/visibility.js';
import { publishPipeline } from '../../events/publish.js';
import type { AccessTokenPayload } from '../../utils/jwt.js';

// Garante que o usuário pode acessar o deal (mesma regra de visibilidade).
async function assertDealAccess(dealId: string, user: AccessTokenPayload) {
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id: dealId }, await dealVisibilityFilter(user)] },
    select: { id: true },
  });
  if (!deal) throw HttpError.notFound('Negociação não encontrada');
}

// Recalcula o valor do deal a partir dos itens e notifica o pipeline.
async function recomputeDealAmount(dealId: string) {
  const items = await prisma.dealItem.findMany({ where: { dealId } });
  const total = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
  const deal = await prisma.deal.update({ where: { id: dealId }, data: { amountCents: total } });
  publishPipeline('deal:updated', deal);
  return total;
}

// -------------------- Itens da negociação --------------------

export async function listItems(dealId: string, user: AccessTokenPayload) {
  await assertDealAccess(dealId, user);
  return prisma.dealItem.findMany({
    where: { dealId },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

interface ItemInput {
  productId?: string;
  description?: string;
  quantity: number;
  unitPriceCents?: number;
}

export async function addItem(dealId: string, user: AccessTokenPayload, input: ItemInput) {
  await assertDealAccess(dealId, user);

  // Se vier productId, herda nome/preço do catálogo (permitindo sobrescrever preço).
  let description = input.description;
  let unitPriceCents = input.unitPriceCents;
  if (input.productId) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw HttpError.badRequest('Produto não encontrado');
    description ??= product.name;
    unitPriceCents ??= product.unitPriceCents;
  }
  if (!description) throw HttpError.badRequest('Informe um produto ou uma descrição');

  const item = await prisma.dealItem.create({
    data: {
      dealId,
      productId: input.productId,
      description,
      quantity: input.quantity,
      unitPriceCents: unitPriceCents ?? 0,
    },
  });
  await recomputeDealAmount(dealId);
  return item;
}

export async function removeItem(dealId: string, itemId: string, user: AccessTokenPayload) {
  await assertDealAccess(dealId, user);
  const item = await prisma.dealItem.findFirst({ where: { id: itemId, dealId } });
  if (!item) throw HttpError.notFound('Item não encontrado');
  await prisma.dealItem.delete({ where: { id: itemId } });
  await recomputeDealAmount(dealId);
}

// -------------------- Propostas --------------------

export async function listProposals(dealId: string, user: AccessTokenPayload) {
  await assertDealAccess(dealId, user);
  return prisma.proposal.findMany({ where: { dealId }, orderBy: { createdAt: 'desc' } });
}

export async function createProposal(
  dealId: string,
  user: AccessTokenPayload,
  input: { title: string; intro?: string },
) {
  await assertDealAccess(dealId, user);
  const items = await prisma.dealItem.findMany({ where: { dealId } });
  if (items.length === 0) {
    throw HttpError.badRequest('Adicione produtos à negociação antes de gerar a proposta');
  }
  const snapshot = items.map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unitPriceCents: i.unitPriceCents,
  }));
  const totalCents = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);

  return prisma.proposal.create({
    data: {
      dealId,
      title: input.title,
      intro: input.intro,
      items: snapshot as Prisma.InputJsonValue,
      totalCents,
      publicToken: randomBytes(16).toString('hex'),
    },
  });
}

export async function updateProposalStatus(id: string, user: AccessTokenPayload, status: ProposalStatus) {
  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) throw HttpError.notFound('Proposta não encontrada');
  await assertDealAccess(proposal.dealId, user);

  return prisma.proposal.update({
    where: { id },
    data: {
      status,
      ...(status === 'SENT' && !proposal.sentAt ? { sentAt: new Date() } : {}),
    },
  });
}

// Visualização pública (sem login) via token — para compartilhar com o cliente.
export async function getPublicProposal(token: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: { deal: { select: { title: true, company: { select: { name: true } } } } },
  });
  if (!proposal) throw HttpError.notFound('Proposta não encontrada');
  return {
    title: proposal.title,
    intro: proposal.intro,
    status: proposal.status,
    totalCents: proposal.totalCents,
    items: proposal.items,
    dealTitle: proposal.deal.title,
    companyName: proposal.deal.company?.name ?? null,
    createdAt: proposal.createdAt,
  };
}
