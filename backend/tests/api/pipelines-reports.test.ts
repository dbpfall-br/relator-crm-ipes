import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Múltiplos funis + Leads', () => {
  beforeEach(async () => {
    await seedDefaultPipeline(); // funil de vendas padrão
  });

  it('SALES não pode criar funil (403)', async () => {
    const { token } = await registerUser();
    const res = await request(app).post('/api/pipelines').set(bearer(token)).send({ name: 'X', kind: 'SALES' });
    expect(res.status).toBe(403);
  });

  it('cria um funil de LEADS com etapas padrão', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const res = await request(app)
      .post('/api/pipelines')
      .set(bearer(admin.token))
      .send({ name: 'Pré-vendas', kind: 'LEADS' });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe('LEADS');
    expect(res.body.stages).toHaveLength(3);
    expect(res.body.stages[0].name).toBe('Novo lead');
  });

  it('converte um lead em negociação no funil de vendas', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const leads = await request(app)
      .post('/api/pipelines')
      .set(bearer(admin.token))
      .send({ name: 'Pré-vendas', kind: 'LEADS' });

    const lead = await request(app)
      .post('/api/deals')
      .set(bearer(admin.token))
      .send({ title: 'Lead ACME', pipelineId: leads.body.id });
    expect(lead.body.pipeline.kind).toBe('LEADS');

    const converted = await request(app)
      .post(`/api/deals/${lead.body.id}/convert`)
      .set(bearer(admin.token));
    expect(converted.status).toBe(200);
    expect(converted.body.pipeline.kind).toBe('SALES');
    expect(converted.body.convertedAt).toBeTruthy();
  });

  it('não converte uma negociação que já é de vendas', async () => {
    const { token } = await registerUser();
    const deal = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Venda' });
    const res = await request(app).post(`/api/deals/${deal.body.id}/convert`).set(bearer(token));
    expect(res.status).toBe(400);
  });
});

describe('Relatórios / BI', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('CRM Live conta ganhas do dia e abertas', async () => {
    const { token } = await registerUser();
    const d1 = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'A', amountCents: 10000 });
    await request(app).post('/api/deals').set(bearer(token)).send({ title: 'B', amountCents: 20000 });
    await request(app).post(`/api/deals/${d1.body.id}/win`).set(bearer(token));

    const res = await request(app).get('/api/reports/live').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.wonToday.count).toBe(1);
    expect(res.body.wonToday.valueCents).toBe(10000);
    expect(res.body.open.count).toBe(1); // B continua aberta
  });

  it('Relatório de concluídas agrega totais e ranking por responsável', async () => {
    const { token, userId } = await registerUser();
    const d1 = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'A', amountCents: 100000 });
    const d2 = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'B', amountCents: 300000 });
    await request(app).post(`/api/deals/${d1.body.id}/win`).set(bearer(token));
    await request(app).post(`/api/deals/${d2.body.id}/lose`).set(bearer(token)).send({});

    const res = await request(app).get('/api/reports/closed').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.totals.wonCount).toBe(1);
    expect(res.body.totals.wonValueCents).toBe(100000);
    expect(res.body.totals.lostCount).toBe(1);
    expect(res.body.totals.winRate).toBe(50);
    expect(res.body.byOwner[0].ownerId).toBe(userId);
  });
});
