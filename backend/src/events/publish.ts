import { emitPipeline, emitToUser, type RealtimeEvent } from '../realtime/io.js';
import { dispatchWebhook } from '../modules/webhooks/webhook.dispatcher.js';

// Camada única de publicação de eventos de domínio.
// Emite para o WebSocket (tempo real) E dispara os webhooks de saída.
// O nome do evento de webhook usa notação por ponto (deal.created); o do
// socket mantém dois-pontos (deal:created) por compatibilidade com o front.
function webhookName(socketEvent: string): string {
  return socketEvent.replace(':', '.');
}

export function publishPipeline(
  socketEvent: RealtimeEvent,
  payload: unknown,
  webhookEvent?: string,
): void {
  emitPipeline(socketEvent, payload);
  dispatchWebhook(webhookEvent ?? webhookName(socketEvent), payload);
}

export function publishToUser(
  userId: string,
  socketEvent: RealtimeEvent,
  payload: unknown,
  webhookEvent?: string,
): void {
  emitToUser(userId, socketEvent, payload);
  dispatchWebhook(webhookEvent ?? webhookName(socketEvent), payload);
}
