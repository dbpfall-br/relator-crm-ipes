import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser } from '../helpers.js';

describe('Users (gestão — ADMIN)', () => {
  it('SALES não pode listar usuários (403)', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/users').set(bearer(token));
    expect(res.status).toBe(403);
  });

  it('ADMIN cria um usuário e ele aparece na lista', async () => {
    const admin = await registerUser({ email: 'admin@test.dev', role: 'ADMIN' });
    const create = await request(app)
      .post('/api/users')
      .set(bearer(admin.token))
      .send({ name: 'Novo Vendedor', email: 'novo@test.dev', password: 'senha12345', role: 'SALES' });
    expect(create.status).toBe(201);
    expect(create.body.email).toBe('novo@test.dev');
    expect(create.body.passwordHash).toBeUndefined(); // nunca expõe o hash

    const list = await request(app).get('/api/users').set(bearer(admin.token));
    expect(list.body.some((u: { email: string }) => u.email === 'novo@test.dev')).toBe(true);
  });

  it('não permite excluir a própria conta (400)', async () => {
    const admin = await registerUser({ email: 'boss@test.dev', role: 'ADMIN' });
    const res = await request(app).delete(`/api/users/${admin.userId}`).set(bearer(admin.token));
    expect(res.status).toBe(400);
  });

  it('exclui um usuário sem vínculos (204)', async () => {
    const admin = await registerUser({ email: 'a@test.dev', role: 'ADMIN' });
    const created = await request(app)
      .post('/api/users')
      .set(bearer(admin.token))
      .send({ name: 'Descartável', email: 'del@test.dev', password: 'senha12345' });

    const res = await request(app).delete(`/api/users/${created.body.id}`).set(bearer(admin.token));
    expect(res.status).toBe(204);
  });

  it('bloqueia exclusão de usuário com negociações (409)', async () => {
    const admin = await registerUser({ email: 'a2@test.dev', role: 'ADMIN' });
    // usuário que vira dono de um deal
    const vendedor = await registerUser({ email: 'v@test.dev' });
    // precisa de pipeline p/ criar deal
    const { seedDefaultPipeline } = await import('../helpers.js');
    await seedDefaultPipeline();
    await request(app).post('/api/deals').set(bearer(vendedor.token)).send({ title: 'Deal' });

    const res = await request(app).delete(`/api/users/${vendedor.userId}`).set(bearer(admin.token));
    expect(res.status).toBe(409);
  });

  it('não permite desativar a própria conta (400)', async () => {
    const admin = await registerUser({ email: 'a3@test.dev', role: 'ADMIN' });
    const res = await request(app)
      .patch(`/api/users/${admin.userId}`)
      .set(bearer(admin.token))
      .send({ isActive: false });
    expect(res.status).toBe(400);
  });
});
