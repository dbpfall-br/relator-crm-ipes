import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Dashboard agregado da empresa', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('consolida valores por status, ticket médio e histórico', async () => {
    const { token } = await registerUser({ role: 'ADMIN' });

    const company = await request(app)
      .post('/api/companies')
      .set(bearer(token))
      .send({ name: 'ACME Corp' });
    const companyId = company.body.id;

    // 2 negociações ganhas + 1 em aberto
    const won1 = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'W1', amountCents: 100000, companyId });
    const won2 = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'W2', amountCents: 300000, companyId });
    await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Open', amountCents: 50000, companyId });
    await request(app).post(`/api/deals/${won1.body.id}/win`).set(bearer(token));
    await request(app).post(`/api/deals/${won2.body.id}/win`).set(bearer(token));

    // uma atividade → aparece no histórico consolidado
    await request(app).post('/api/activities').set(bearer(token)).send({ type: 'CALL', subject: 'Follow-up', dealId: won1.body.id });

    const res = await request(app).get(`/api/companies/${companyId}/dashboard`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.metrics.wonValueCents).toBe(400000);
    expect(res.body.metrics.openValueCents).toBe(50000);
    expect(res.body.metrics.wonCount).toBe(2);
    expect(res.body.metrics.avgTicketCents).toBe(200000); // (100k+300k)/2
    expect(res.body.deals).toHaveLength(3);
    expect(res.body.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it('retorna 404 para empresa inexistente', async () => {
    const { token } = await registerUser({ role: 'ADMIN' });
    const res = await request(app)
      .get('/api/companies/00000000-0000-0000-0000-000000000999/dashboard')
      .set(bearer(token));
    expect(res.status).toBe(404);
  });
});
