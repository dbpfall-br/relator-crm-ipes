import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Produtos', () => {
  it('SALES não cria produto (403); ADMIN cria', async () => {
    const sales = await registerUser();
    const s = await request(app).post('/api/products').set(bearer(sales.token)).send({ name: 'X', unitPriceCents: 100 });
    expect(s.status).toBe(403);

    const admin = await registerUser({ role: 'ADMIN' });
    const a = await request(app).post('/api/products').set(bearer(admin.token)).send({ name: 'Licença', unitPriceCents: 50000 });
    expect(a.status).toBe(201);
    expect(a.body.name).toBe('Licença');
  });
});

describe('Itens da negociação (valor recalculado)', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('adicionar itens recalcula o valor do deal', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const product = await request(app).post('/api/products').set(bearer(admin.token)).send({ name: 'Hora consultoria', unitPriceCents: 20000 });
    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'Projeto' });

    const item = await request(app)
      .post(`/api/deals/${deal.body.id}/items`)
      .set(bearer(admin.token))
      .send({ productId: product.body.id, quantity: 3 });
    expect(item.status).toBe(201);
    expect(item.body.description).toBe('Hora consultoria'); // herdou do produto
    expect(item.body.unitPriceCents).toBe(20000);

    const updated = await request(app).get(`/api/deals/${deal.body.id}`).set(bearer(admin.token));
    expect(updated.body.amountCents).toBe(60000); // 3 * 20000
  });

  it('remover item recalcula para baixo', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'P' });
    const it = await request(app).post(`/api/deals/${deal.body.id}/items`).set(bearer(admin.token)).send({ description: 'Item', quantity: 2, unitPriceCents: 5000 });
    let d = await request(app).get(`/api/deals/${deal.body.id}`).set(bearer(admin.token));
    expect(d.body.amountCents).toBe(10000);

    await request(app).delete(`/api/deals/${deal.body.id}/items/${it.body.id}`).set(bearer(admin.token));
    d = await request(app).get(`/api/deals/${deal.body.id}`).set(bearer(admin.token));
    expect(d.body.amountCents).toBe(0);
  });
});

describe('Propostas', () => {
  beforeEach(async () => { await seedDefaultPipeline(); });

  it('não gera proposta sem itens (400)', async () => {
    const { token } = await registerUser();
    const deal = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Vazio' });
    const res = await request(app).post(`/api/deals/${deal.body.id}/proposals`).set(bearer(token)).send({ title: 'Proposta' });
    expect(res.status).toBe(400);
  });

  it('gera proposta com snapshot dos itens e permite ver publicamente', async () => {
    const { token } = await registerUser();
    const deal = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Com itens' });
    await request(app).post(`/api/deals/${deal.body.id}/items`).set(bearer(token)).send({ description: 'Plano Pro', quantity: 2, unitPriceCents: 30000 });

    const prop = await request(app).post(`/api/deals/${deal.body.id}/proposals`).set(bearer(token)).send({ title: 'Proposta Comercial', intro: 'Obrigado pelo interesse' });
    expect(prop.status).toBe(201);
    expect(prop.body.totalCents).toBe(60000);
    expect(prop.body.items).toHaveLength(1);
    expect(prop.body.status).toBe('DRAFT');

    // muda status para SENT
    const sent = await request(app).patch(`/api/proposals/${prop.body.id}/status`).set(bearer(token)).send({ status: 'SENT' });
    expect(sent.body.status).toBe('SENT');
    expect(sent.body.sentAt).toBeTruthy();

    // visualização pública sem autenticação
    const pub = await request(app).get(`/api/proposals/public/${prop.body.publicToken}`);
    expect(pub.status).toBe(200);
    expect(pub.body.title).toBe('Proposta Comercial');
    expect(pub.body.totalCents).toBe(60000);
  });
});
