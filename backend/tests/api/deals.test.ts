import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Deals', () => {
  let stages: { id: string; name: string; position: number }[];

  beforeEach(async () => {
    const pipeline = await seedDefaultPipeline();
    stages = pipeline.stages;
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/deals');
    expect(res.status).toBe(401);
  });

  it('cria uma negociação na primeira etapa por padrão', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/deals')
      .set(bearer(token))
      .send({ title: 'Deal A', amountCents: 100000 });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Deal A');
    expect(res.body.stage.name).toBe('Prospecção'); // 1ª etapa
    expect(res.body.status).toBe('OPEN');
  });

  it('retorna o board agrupado por etapa', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Deal B', amountCents: 5000 });

    const res = await request(app).get('/api/deals/board').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.columns).toHaveLength(3);
    const prospeccao = res.body.columns.find((c: any) => c.stage.name === 'Prospecção');
    expect(prospeccao.deals).toHaveLength(1);
  });

  it('move a negociação para outra etapa', async () => {
    const { token } = await registerUser();
    const created = await request(app)
      .post('/api/deals')
      .set(bearer(token))
      .send({ title: 'Deal C', amountCents: 5000 });

    const target = stages[1]!; // Qualificação
    const res = await request(app)
      .post(`/api/deals/${created.body.id}/move`)
      .set(bearer(token))
      .send({ stageId: target.id, position: 0 });

    expect(res.status).toBe(200);
    expect(res.body.stage.name).toBe('Qualificação');
  });

  it('marca como ganha e reflete o status', async () => {
    const { token } = await registerUser();
    const created = await request(app)
      .post('/api/deals')
      .set(bearer(token))
      .send({ title: 'Deal D', amountCents: 5000 });

    const res = await request(app).post(`/api/deals/${created.body.id}/win`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('WON');
    expect(res.body.closedAt).toBeTruthy();
  });

  it('respeita a visibilidade: SALES não vê a negociação de outro vendedor', async () => {
    const alice = await registerUser({ email: 'alice@test.dev' });
    const bob = await registerUser({ email: 'bob@test.dev' });

    const dealDaAlice = await request(app)
      .post('/api/deals')
      .set(bearer(alice.token))
      .send({ title: 'Segredo da Alice', amountCents: 999 });

    // Bob (SALES) tenta acessar o deal da Alice → 404 (não vaza existência)
    const res = await request(app)
      .get(`/api/deals/${dealDaAlice.body.id}`)
      .set(bearer(bob.token));
    expect(res.status).toBe(404);
  });

  it('ADMIN enxerga negociações de todos', async () => {
    const sales = await registerUser({ email: 'vendedor@test.dev' });
    const admin = await registerUser({ email: 'chefe@test.dev', role: 'ADMIN' });

    await request(app)
      .post('/api/deals')
      .set(bearer(sales.token))
      .send({ title: 'Deal do vendedor', amountCents: 1000 });

    const res = await request(app).get('/api/deals').set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('persiste campos customizados (JSONB)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/deals')
      .set(bearer(token))
      .send({ title: 'Deal E', customFields: { origem: 'Indicação', prioridade: 3 } });

    expect(res.status).toBe(201);
    expect(res.body.customFields).toEqual({ origem: 'Indicação', prioridade: 3 });
  });
});
