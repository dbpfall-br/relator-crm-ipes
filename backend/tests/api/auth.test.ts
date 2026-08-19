import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser } from '../helpers.js';

describe('Auth', () => {
  it('registra um usuário e retorna tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana',
      email: 'ana@test.dev',
      password: 'senha12345',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@test.dev');
    expect(res.body.user.role).toBe('SALES'); // papel padrão
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    // nunca expõe o hash da senha
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejeita e-mail duplicado com 409', async () => {
    await registerUser({ email: 'dup@test.dev' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Outro',
      email: 'dup@test.dev',
      password: 'senha12345',
    });
    expect(res.status).toBe(409);
  });

  it('valida entrada (senha curta) com 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X',
      email: 'x@test.dev',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('faz login com credenciais corretas', async () => {
    await registerUser({ email: 'log@test.dev', password: 'senha12345' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'log@test.dev', password: 'senha12345' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejeita senha errada com 401', async () => {
    await registerUser({ email: 'wrong@test.dev', password: 'senha12345' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.dev', password: 'senhaERRADA' });
    expect(res.status).toBe(401);
  });

  it('/auth/me exige token', async () => {
    const semToken = await request(app).get('/api/auth/me');
    expect(semToken.status).toBe(401);

    const { token } = await registerUser({ email: 'me@test.dev' });
    const comToken = await request(app).get('/api/auth/me').set(bearer(token));
    expect(comToken.status).toBe(200);
    expect(comToken.body.email).toBe('me@test.dev');
  });
});
