import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Stages (colunas do Kanban)', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('lista as etapas do pipeline padrão', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/stages').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe('Prospecção');
  });

  it('SALES não pode criar etapa (403)', async () => {
    const { token } = await registerUser(); // SALES
    const res = await request(app).post('/api/stages').set(bearer(token)).send({ name: 'Nova' });
    expect(res.status).toBe(403);
  });

  it('ADMIN cria uma etapa no fim do funil', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const res = await request(app)
      .post('/api/stages')
      .set(bearer(admin.token))
      .send({ name: 'Pós-venda', probability: 100 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Pós-venda');
    expect(res.body.position).toBe(3); // após as 3 existentes (0,1,2)
  });

  it('renomeia uma etapa', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const list = await request(app).get('/api/stages').set(bearer(admin.token));
    const first = list.body[0];
    const res = await request(app)
      .patch(`/api/stages/${first.id}`)
      .set(bearer(admin.token))
      .send({ name: 'Novo Lead' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Novo Lead');
  });

  it('não exclui etapa que contém negociações (409)', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const list = await request(app).get('/api/stages').set(bearer(admin.token));
    const first = list.body[0];
    // cria um deal (cai na 1ª etapa)
    await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'X' });

    const res = await request(app).delete(`/api/stages/${first.id}`).set(bearer(admin.token));
    expect(res.status).toBe(409);
  });

  it('exclui etapa vazia', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const list = await request(app).get('/api/stages').set(bearer(admin.token));
    const last = list.body[2];
    const res = await request(app).delete(`/api/stages/${last.id}`).set(bearer(admin.token));
    expect(res.status).toBe(204);
    const after = await request(app).get('/api/stages').set(bearer(admin.token));
    expect(after.body).toHaveLength(2);
  });

  it('reordena as colunas', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const list = await request(app).get('/api/stages').set(bearer(admin.token));
    const reversed = [...list.body].reverse().map((s: { id: string }) => s.id);

    const res = await request(app)
      .post('/api/stages/reorder')
      .set(bearer(admin.token))
      .send({ orderedIds: reversed });
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Fechamento'); // era a última, agora é a primeira
  });
});
