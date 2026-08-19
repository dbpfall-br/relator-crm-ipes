import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';

// Tabelas na ordem inversa de dependência (TRUNCATE ... CASCADE cuida das FKs).
const TABLES = [
  'webhook_deliveries',
  'webhooks',
  'saved_filters',
  'custom_field_defs',
  'automation_rules',
  'deal_questionnaire_responses',
  'questionnaire_questions',
  'questionnaires',
  'templates',
  'goals',
  'proposals',
  'deal_items',
  'products',
  'activities',
  'deals',
  'loss_reasons',
  'sources',
  'campaigns',
  'stages',
  'pipelines',
  'contacts',
  'companies',
  'refresh_tokens',
  'users',
];

// Cada teste começa com o banco limpo → isolamento total entre casos.
beforeEach(async () => {
  const list = TABLES.map((t) => `test."${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
