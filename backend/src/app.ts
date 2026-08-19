import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import dealsRoutes from './modules/deals/deals.routes.js';
import companiesRoutes from './modules/companies/companies.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import activitiesRoutes from './modules/activities/activities.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import stagesRoutes from './modules/stages/stages.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import customFieldsRoutes from './modules/custom-fields/custom-fields.routes.js';
import savedFiltersRoutes from './modules/saved-filters/saved-filters.routes.js';
import pipelinesRoutes from './modules/pipelines/pipelines.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import { dealCommerceRouter, proposalsRouter } from './modules/commerce/commerce.routes.js';
import automationRoutes from './modules/automation/automation.routes.js';
import questionnairesRoutes from './modules/questionnaires/questionnaires.routes.js';
import templatesRoutes from './modules/templates/templates.routes.js';
import goalsRoutes from './modules/goals/goals.routes.js';
import {
  campaignsRouter,
  lossReasonsRouter,
  sourcesRouter,
} from './modules/catalogs/catalogs.routes.js';
import { openapiSpec } from './openapi.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  // Healthcheck
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Contrato OpenAPI (para integrações externas / geração de SDKs)
  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

  // Rotas de negócio
  app.use('/api/auth', authRoutes);
  app.use('/api/deals', dealsRoutes);
  app.use('/api/companies', companiesRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/activities', activitiesRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/stages', stagesRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/custom-fields', customFieldsRoutes);
  app.use('/api/saved-filters', savedFiltersRoutes);
  app.use('/api/pipelines', pipelinesRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/deals/:dealId', dealCommerceRouter); // /items e /proposals aninhados
  app.use('/api/proposals', proposalsRouter);
  app.use('/api/automation-rules', automationRoutes);
  app.use('/api/questionnaires', questionnairesRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/loss-reasons', lossReasonsRouter);
  app.use('/api/sources', sourcesRouter);
  app.use('/api/campaigns', campaignsRouter);

  // 404 + tratamento de erros (sempre por último)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
