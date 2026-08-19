import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, bearer, registerUser, seedDefaultPipeline } from '../helpers.js';

describe('Campos personalizados', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('SALES não pode criar definição de campo (403)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/custom-fields')
      .set(bearer(token))
      .send({ entity: 'DEAL', label: 'Origem', type: 'TEXT' });
    expect(res.status).toBe(403);
  });

  it('campo obrigatório bloqueia criação de deal sem o valor (400) e permite com (201)', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    await request(app)
      .post('/api/custom-fields')
      .set(bearer(admin.token))
      .send({ entity: 'DEAL', key: 'contrato', label: 'Tipo de Contrato', type: 'TEXT', required: true });

    const semCampo = await request(app)
      .post('/api/deals')
      .set(bearer(admin.token))
      .send({ title: 'Sem campo' });
    expect(semCampo.status).toBe(400);

    const comCampo = await request(app)
      .post('/api/deals')
      .set(bearer(admin.token))
      .send({ title: 'Com campo', customFields: { contrato: 'Anual' } });
    expect(comCampo.status).toBe(201);
    expect(comCampo.body.customFields.contrato).toBe('Anual');
  });

  it('valida opção de um campo SELECT', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    await request(app)
      .post('/api/custom-fields')
      .set(bearer(admin.token))
      .send({ entity: 'DEAL', key: 'plano', label: 'Plano', type: 'SELECT', options: ['Basic', 'Pro'] });

    const invalido = await request(app)
      .post('/api/deals')
      .set(bearer(admin.token))
      .send({ title: 'X', customFields: { plano: 'Enterprise' } });
    expect(invalido.status).toBe(400);
  });
});

describe('Motivo de perda', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('registra o motivo ao marcar negociação como perdida', async () => {
    const admin = await registerUser({ role: 'ADMIN' });
    const reason = await request(app)
      .post('/api/loss-reasons')
      .set(bearer(admin.token))
      .send({ label: 'Preço alto' });
    expect(reason.status).toBe(201);

    const deal = await request(app).post('/api/deals').set(bearer(admin.token)).send({ title: 'D' });
    const lost = await request(app)
      .post(`/api/deals/${deal.body.id}/lose`)
      .set(bearer(admin.token))
      .send({ lossReasonId: reason.body.id });

    expect(lost.status).toBe(200);
    expect(lost.body.status).toBe('LOST');
    expect(lost.body.lossReason.label).toBe('Preço alto');
  });
});

describe('Atividades — concluir com anotação', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('gera uma anotação vinculada ao concluir a tarefa', async () => {
    const { token } = await registerUser();
    const deal = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'D' });
    const task = await request(app)
      .post('/api/activities')
      .set(bearer(token))
      .send({ type: 'CALL', subject: 'Ligar', dealId: deal.body.id });

    await request(app)
      .post(`/api/activities/${task.body.id}/complete`)
      .set(bearer(token))
      .send({ note: 'Cliente confirmou interesse' });

    const acts = await request(app)
      .get(`/api/activities?dealId=${deal.body.id}`)
      .set(bearer(token));
    // tarefa original + anotação gerada
    const note = acts.body.items.find((a: { type: string }) => a.type === 'NOTE');
    expect(note).toBeTruthy();
    expect(note.notes).toContain('Cliente confirmou');
  });
});

describe('Lista do funil — filtro sem tarefa e export', () => {
  beforeEach(async () => {
    await seedDefaultPipeline();
  });

  it('withoutTask=true retorna só negociações sem tarefa em aberto', async () => {
    const { token } = await registerUser();
    const comTask = await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Com tarefa' });
    await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Sem tarefa' });
    await request(app)
      .post('/api/activities')
      .set(bearer(token))
      .send({ type: 'TASK', subject: 'Follow-up', dealId: comTask.body.id });

    const res = await request(app).get('/api/deals?withoutTask=true').set(bearer(token));
    expect(res.status).toBe(200);
    const titles = res.body.items.map((d: { title: string }) => d.title);
    expect(titles).toContain('Sem tarefa');
    expect(titles).not.toContain('Com tarefa');
  });

  it('exporta CSV com cabeçalho e linhas', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/deals').set(bearer(token)).send({ title: 'Exportável', amountCents: 12345 });
    const res = await request(app).get('/api/deals/export.csv').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Titulo');
    expect(res.text).toContain('Exportável');
  });
});
