import { execSync } from 'node:child_process';

// Roda UMA vez antes de toda a suíte: cria/atualiza as tabelas no schema "test".
// `prisma db push` cria o schema e as tabelas a partir do schema.prisma.
export default function setup() {
  const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/relator_crm?schema=test';
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
