import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser } from '../helpers.js';

describe('Webhooks (admin-only)', () => {
  it('nega acesso a não-ADMIN com 403', async () => {
    const { token } = await registerUser(); // SALES
    const res = await request(app).get('/api/webhooks').set(bearer(token));
    expect(res.status).toBe(403);
  });

  it('ADMIN registra um webhook e recebe um secret gerado', async () => {
    const admin = await registerUser({ email: 'admin@test.dev', role: 'ADMIN' });
    const res = await request(app)
      .post('/api/webhooks')
      .set(bearer(admin.token))
      .send({ url: 'https://example.com/hook', events: ['deal.created'] });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe('https://example.com/hook');
    expect(res.body.secret).toBeTruthy(); // segredo gerado automaticamente
    expect(res.body.isActive).toBe(true);
  });

  it('valida URL inválida com 400', async () => {
    const admin = await registerUser({ email: 'admin2@test.dev', role: 'ADMIN' });
    const res = await request(app)
      .post('/api/webhooks')
      .set(bearer(admin.token))
      .send({ url: 'não-é-url', events: [] });
    expect(res.status).toBe(400);
  });
});
