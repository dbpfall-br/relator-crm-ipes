import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';

let io: SocketServer | null = null;

// Eventos emitidos para os clientes (Kanban / notificações em tempo real).
export type RealtimeEvent =
  | 'deal:created'
  | 'deal:updated'
  | 'deal:moved'
  | 'deal:deleted'
  | 'stage:changed'
  | 'activity:created'
  | 'task:due';

export function initRealtime(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  // Handshake autenticado por JWT (socket.handshake.auth.token).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Token ausente'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string } | undefined;
    // Sala por usuário (notificações direcionadas) e sala global do pipeline.
    if (user) socket.join(`user:${user.sub}`);
    socket.join('pipeline');
  });

  return io;
}

// Emite para todos que acompanham o pipeline (Kanban).
export function emitPipeline(event: RealtimeEvent, payload: unknown): void {
  io?.to('pipeline').emit(event, payload);
}

// Emite direcionado a um usuário específico (ex.: tarefa vencendo).
export function emitToUser(userId: string, event: RealtimeEvent, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
