import { createHmac } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

// Entrega um evento de domínio para todos os webhooks ativos que o assinam.
// Fire-and-forget: nunca bloqueia o fluxo da API; falhas são registradas no log.
export function dispatchWebhook(event: string, payload: unknown): void {
  void deliver(event, payload).catch((err) => {
    console.error('[webhook] erro inesperado no dispatch', err);
  });
}

async function deliver(event: string, payload: unknown): Promise<void> {
  const webhooks = await prisma.webhook.findMany({ where: { isActive: true } });
  const subscribers = webhooks.filter(
    (w) => w.events.length === 0 || w.events.includes(event),
  );
  if (subscribers.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.all(
    subscribers.map(async (webhook) => {
      // Assinatura HMAC-SHA256 do corpo — o receptor valida com o mesmo segredo.
      const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

      let status: 'SUCCESS' | 'FAILED' = 'FAILED';
      let responseCode: number | null = null;
      let error: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Relator-Event': event,
            'X-Relator-Signature': `sha256=${signature}`,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        responseCode = res.status;
        status = res.ok ? 'SUCCESS' : 'FAILED';
        if (!res.ok) error = `HTTP ${res.status}`;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          status,
          responseCode,
          error,
          payload: JSON.parse(JSON.stringify(payload)),
        },
      });
    }),
  );
}
