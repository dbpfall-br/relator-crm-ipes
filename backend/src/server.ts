import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initRealtime } from './realtime/io.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const server = createServer(app);

// WebSocket (Socket.IO) compartilha o mesmo servidor HTTP.
initRealtime(server);

server.listen(env.port, () => {
  console.log(`🚀 Relator CRM API em http://localhost:${env.port}`);
  console.log(`   OpenAPI:  http://localhost:${env.port}/api/openapi.json`);
  console.log(`   Health:   http://localhost:${env.port}/health`);
});

// Encerramento gracioso — fecha conexões do Prisma.
async function shutdown(signal: string) {
  console.log(`\n${signal} recebido, encerrando...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
