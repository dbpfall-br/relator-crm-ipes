// Documento OpenAPI 3.1 mínimo (auth + deals). Serve como contrato para
// integrações externas: scripts, CLIs e agentes de IA que operam o CRM via API.
export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Relator CRM API',
    version: '0.1.0',
    description:
      'API-first CRM. Autenticação JWT; pipeline de vendas (Deals) com eventos em tempo real via WebSocket (Socket.IO).',
  },
  servers: [{ url: 'http://localhost:4000/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cria usuário e retorna tokens',
        security: [],
        requestBody: { $ref: '#/components/requestBodies/Register' },
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login com e-mail/senha',
        security: [],
        responses: { '200': { description: 'OK' }, '401': { description: 'Credenciais inválidas' } },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Renova o access token', security: [], responses: { '200': { description: 'OK' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoga o refresh token', security: [], responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Perfil autenticado', responses: { '200': { description: 'OK' } } },
    },
    '/deals': {
      get: {
        tags: ['Deals'],
        summary: 'Lista negociações (filtros + paginação)',
        parameters: [
          { name: 'status', in: 'query', schema: { enum: ['OPEN', 'WON', 'LOST'] } },
          { name: 'stageId', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: { tags: ['Deals'], summary: 'Cria negociação', responses: { '201': { description: 'Criado' } } },
    },
    '/deals/board': {
      get: { tags: ['Deals'], summary: 'Pipeline agrupado por etapa (Kanban)', responses: { '200': { description: 'OK' } } },
    },
    '/deals/{id}': {
      get: { tags: ['Deals'], summary: 'Detalha negociação', responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Deals'], summary: 'Atualiza negociação', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Deals'], summary: 'Remove negociação', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/deals/{id}/move': {
      post: { tags: ['Deals'], summary: 'Move no Kanban (etapa + posição)', responses: { '200': { description: 'OK' } } },
    },
    '/deals/{id}/convert': {
      post: { tags: ['Deals'], summary: 'Converte lead (funil LEADS) em negociação de vendas', responses: { '200': { description: 'OK' } } },
    },
    '/pipelines': {
      get: { tags: ['Pipelines'], summary: 'Lista funis (vendas e pré-vendas)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Pipelines'], summary: 'Cria funil com etapas padrão (ADMIN/MANAGER)', responses: { '201': { description: 'Criado' } } },
    },
    '/pipelines/{id}': {
      patch: { tags: ['Pipelines'], summary: 'Renomeia / define padrão (ADMIN/MANAGER)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Pipelines'], summary: 'Exclui funil vazio (ADMIN/MANAGER)', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/reports/live': {
      get: { tags: ['Reports'], summary: 'CRM Live: contadores do dia + totais em aberto', responses: { '200': { description: 'OK' } } },
    },
    '/reports/closed': {
      get: { tags: ['Reports'], summary: 'Relatório de concluídas: série mensal + ranking por responsável', responses: { '200': { description: 'OK' } } },
    },
    '/products': {
      get: { tags: ['Products'], summary: 'Lista produtos/serviços', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Products'], summary: 'Cria produto (ADMIN/MANAGER)', responses: { '201': { description: 'Criado' } } },
    },
    '/products/{id}': {
      patch: { tags: ['Products'], summary: 'Atualiza produto (ADMIN/MANAGER)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Products'], summary: 'Remove produto (ADMIN/MANAGER)', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/deals/{dealId}/items': {
      get: { tags: ['Products'], summary: 'Itens (produtos) da negociação', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Products'], summary: 'Adiciona item — recalcula o valor do deal', responses: { '201': { description: 'Criado' } } },
    },
    '/deals/{dealId}/proposals': {
      get: { tags: ['Proposals'], summary: 'Propostas da negociação', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Proposals'], summary: 'Gera proposta (snapshot dos itens)', responses: { '201': { description: 'Criado' } } },
    },
    '/proposals/{id}/status': {
      patch: { tags: ['Proposals'], summary: 'Muda status (DRAFT/SENT/ACCEPTED/REJECTED)', responses: { '200': { description: 'OK' } } },
    },
    '/proposals/public/{token}': {
      get: { tags: ['Proposals'], summary: 'Visualização pública da proposta (sem login)', security: [], responses: { '200': { description: 'OK' } } },
    },
    '/automation-rules': {
      get: { tags: ['Automation'], summary: 'Lista regras de automação (ADMIN)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Automation'], summary: 'Cria regra gatilho→ação (ADMIN)', description: 'Gatilhos: DEAL_CREATED/MOVED/WON/LOST/CONVERTED. Ações: CREATE_TASK, CREATE_NOTE, MOVE_STAGE, SET_QUALIFICATION.', responses: { '201': { description: 'Criado' } } },
    },
    '/questionnaires': {
      get: { tags: ['Questionnaires'], summary: 'Lista questionários ativos + perguntas', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Questionnaires'], summary: 'Cria questionário (ADMIN)', responses: { '201': { description: 'Criado' } } },
    },
    '/questionnaires/{id}/deal/{dealId}': {
      put: { tags: ['Questionnaires'], summary: 'Salva respostas do questionário na negociação', responses: { '200': { description: 'OK' } } },
    },
    '/templates': {
      get: { tags: ['Templates'], summary: 'Lista modelos (e-mail/proposta)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Templates'], summary: 'Cria modelo com placeholders {{deal.title}} etc (ADMIN/MANAGER)', responses: { '201': { description: 'Criado' } } },
    },
    '/templates/{id}/render': {
      get: { tags: ['Templates'], summary: 'Renderiza o modelo preenchido para uma negociação (?dealId=)', responses: { '200': { description: 'OK' } } },
    },
    '/goals': {
      get: { tags: ['Goals'], summary: 'Metas do período (?period=AAAA-MM) com progresso', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Goals'], summary: 'Define meta por usuário/time (ADMIN/MANAGER)', responses: { '201': { description: 'Criado' } } },
    },
    '/deals/{id}/win': {
      post: { tags: ['Deals'], summary: 'Marca como ganha', responses: { '200': { description: 'OK' } } },
    },
    '/deals/{id}/lose': {
      post: { tags: ['Deals'], summary: 'Marca como perdida', responses: { '200': { description: 'OK' } } },
    },
    '/companies': {
      get: { tags: ['Companies'], summary: 'Lista empresas', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Companies'], summary: 'Cria empresa', responses: { '201': { description: 'Criado' } } },
    },
    '/companies/{id}/dashboard': {
      get: { tags: ['Companies'], summary: 'Dashboard agregado da empresa (métricas + histórico)', responses: { '200': { description: 'OK' } } },
    },
    '/companies/{id}': {
      get: { tags: ['Companies'], summary: 'Detalha empresa', responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Companies'], summary: 'Atualiza empresa', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Companies'], summary: 'Remove empresa', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/contacts': {
      get: { tags: ['Contacts'], summary: 'Lista contatos', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Contacts'], summary: 'Cria contato', responses: { '201': { description: 'Criado' } } },
    },
    '/contacts/{id}': {
      get: { tags: ['Contacts'], summary: 'Detalha contato', responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Contacts'], summary: 'Atualiza contato', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Contacts'], summary: 'Remove contato', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/activities': {
      get: { tags: ['Activities'], summary: 'Lista atividades (timeline)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Activities'], summary: 'Cria atividade/tarefa', responses: { '201': { description: 'Criado' } } },
    },
    '/activities/tasks': {
      get: { tags: ['Activities'], summary: 'Tarefas do usuário (atrasadas/hoje/futuras)', responses: { '200': { description: 'OK' } } },
    },
    '/activities/{id}': {
      patch: { tags: ['Activities'], summary: 'Atualiza atividade', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Activities'], summary: 'Remove atividade', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/activities/{id}/complete': {
      post: { tags: ['Activities'], summary: 'Conclui tarefa', responses: { '200': { description: 'OK' } } },
    },
    '/dashboard/summary': {
      get: { tags: ['Dashboard'], summary: 'KPIs: ganhas/perdidas/abertas, pipeline, funil', responses: { '200': { description: 'OK' } } },
    },
    '/webhooks': {
      get: { tags: ['Webhooks'], summary: 'Lista webhooks (ADMIN)', responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Webhooks'],
        summary: 'Registra webhook de saída (ADMIN)',
        description:
          'Eventos: deal.created, deal.updated, deal.moved, deal.deleted, deal.won, deal.lost, activity.created. Entregas assinadas com HMAC-SHA256 no header X-Relator-Signature.',
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/webhooks/{id}': {
      get: { tags: ['Webhooks'], summary: 'Detalha webhook + últimas entregas (ADMIN)', responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Webhooks'], summary: 'Atualiza webhook (ADMIN)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Webhooks'], summary: 'Remove webhook (ADMIN)', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/webhooks/{id}/test': {
      post: { tags: ['Webhooks'], summary: 'Dispara evento de teste (ADMIN)', responses: { '200': { description: 'OK' } } },
    },
    '/stages': {
      get: { tags: ['Stages'], summary: 'Lista etapas do funil (colunas do Kanban)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Stages'], summary: 'Cria etapa (ADMIN/MANAGER)', responses: { '201': { description: 'Criado' } } },
    },
    '/stages/reorder': {
      post: { tags: ['Stages'], summary: 'Reordena as colunas (ADMIN/MANAGER)', responses: { '200': { description: 'OK' } } },
    },
    '/stages/{id}': {
      patch: { tags: ['Stages'], summary: 'Renomeia/ajusta etapa (ADMIN/MANAGER)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Stages'], summary: 'Exclui etapa vazia (ADMIN/MANAGER)', responses: { '204': { description: 'Sem conteúdo' } } },
    },
    '/users': {
      get: { tags: ['Users'], summary: 'Lista usuários (ADMIN)', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Users'], summary: 'Cria usuário (ADMIN)', responses: { '201': { description: 'Criado' } } },
    },
    '/users/{id}': {
      patch: { tags: ['Users'], summary: 'Atualiza papel/ativo (ADMIN)', responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Users'], summary: 'Exclui usuário sem vínculos (ADMIN)', responses: { '204': { description: 'Sem conteúdo' } } },
    },
  },
  requestBodies: {
    Register: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              role: { enum: ['ADMIN', 'MANAGER', 'SALES'] },
            },
          },
        },
      },
    },
  },
} as const;
