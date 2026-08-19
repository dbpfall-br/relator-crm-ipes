import { io, type Socket } from 'socket.io-client';
import { API_URL } from './config.js';
import { tokenStore } from './api.js';

let socket: Socket | null = null;

// Conecta (uma vez) ao servidor de tempo real, autenticando com o access token.
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_URL, {
    auth: { token: tokenStore.access },
    autoConnect: true,
  });
  return socket;
}

export function reconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  getSocket();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
