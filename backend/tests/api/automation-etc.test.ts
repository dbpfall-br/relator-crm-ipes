import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Automação (gatilho → ação)', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('cria uma tarefa automaticamente ao criar uma negociação', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    await request(app).post('/api/automation-rules').set(bearer(admin.token)).send({
      name: 'Follow-up ao criar',
      trigger: 'DEAL_CREATED',
      action: 'CREATE_TASK',
      actionConfig: { subject: 'Ligar para o novo lead', type: 'CALL', dueInDays: 2 },
    });

    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'Novo negócio' });
    // dá tempo do fire-and-forget concluir
    await new Promise((r) => setTimeout(r, 300));

    const acts = await request(app).get(`/api/activities?dealId=${deal.body.id}`).set(bearer(admin.token));
    const task = acts.body.items.find((a: { subject: string }) => a.subject === 'Ligar para o novo lead');
    expect(task).toBeTruthy();
    expect(task.type).toBe('CALL');
  });

  it('SALES não gerencia automações (403)', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/automation-rules').set(bearer(token));
    expect(res.status).toBe(403);
  });
});

describe('Questionários', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('cria questionário, pergunta e salva respostas na negociação', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const q = await request(app).post('/api/questionnaires').set(bearer(admin.token)).send({ name: 'Qualificação BANT' });
    const question = await request(app).post(`/api/questionnaires/${q.body.id}/questions`).set(bearer(admin.token)).send({ text: 'Tem orçamento?', type: 'BOOLEAN' });

    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'D' });
    const save = await request(app)
      .put(`/api/questionnaires/${q.body.id}/deal/${deal.body.id}`)
      .set(bearer(admin.token))
      .send({ answers: { [question.body.id]: true } });
    expect(save.status).toBe(200);

    const resp = await request(app).get(`/api/questionnaires/deal/${deal.body.id}/responses`).set(bearer(admin.token));
    expect(resp.body[0].answers[question.body.id]).toBe(true);
  });
});

describe('Modelos (templates)', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('renderiza placeholders com dados da negociação', async () => {
    const admin = await registerUser({ role: 'ADMIN', name: 'Carla' });
    await request(app).post('/api/templates').set(bearer(admin.token)).send({
      name: 'Follow-up', type: 'EMAIL', subject: 'Sobre {{deal.title}}',
      body: 'Olá! Segue proposta de {{deal.amount}}. Att, {{owner.name}}',
    });
    const template = (await request(app).get('/api/templates').set(bearer(admin.token))).body[0];
    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'Projeto X', amountCents: 500000 });

    const rendered = await request(app).get(`/api/templates/${template.id}/render?dealId=${deal.body.id}`).set(bearer(admin.token));
    expect(rendered.status).toBe(200);
    expect(rendered.body.subject).toBe('Sobre Projeto X');
    expect(rendered.body.body).toContain('R$');
    expect(rendered.body.body).toContain('Carla');
  });
});

describe('Metas', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('calcula o progresso a partir das negociações ganhas no mês', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const period = new Date().toISOString().slice(0, 7);
    await request(app).post('/api/goals').set(bearer(admin.token)).send({ period, metric: 'WON_VALUE', target: 1000000 });

    const d = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'Ganha', amountCents: 400000 });
    await request(app).post(`/api/deals/${d.body.id}/win`).set(bearer(admin.token));

    const res = await request(app).get(`/api/goals?period=${period}`).set(bearer(admin.token));
    expect(res.status).toBe(200);
    const goal = res.body.goals[0];
    expect(goal.actual).toBe(400000);
    expect(goal.percent).toBe(40); // 400k / 1M
  });
});
