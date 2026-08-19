import { defineConfig } from 'vitest/config';

// URL do banco de TESTE: mesmo Postgres, mas em um schema isolado ("test"),
// para nunca tocar nos dados de desenvolvimento (schema "public").
const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/relator_crm?schema=test';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Um único schema compartilhado → roda os arquivos em série p/ evitar corrida.
    fileParallelism: false,
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
      JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    },
  },
});
