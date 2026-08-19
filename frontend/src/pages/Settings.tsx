import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import type { Catalog, CustomFieldDef, CustomFieldEntity, CustomFieldType, Pipeline, Product, Questionnaire, Template, TemplateType } from '../lib/types.js';

const ENTITIES: { key: CustomFieldEntity; label: string }[] = [
  { key: 'DEAL', label: 'Negociação' },
  { key: 'COMPANY', label: 'Empresa' },
  { key: 'CONTACT', label: 'Contato' },
];
const TYPES: { key: CustomFieldType; label: string }[] = [
  { key: 'TEXT', label: 'Texto' },
  { key: 'NUMBER', label: 'Número' },
  { key: 'DATE', label: 'Data' },
  { key: 'SELECT', label: 'Seleção única' },
  { key: 'MULTISELECT', label: 'Seleção múltipla' },
];

export default function Settings() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configurações</h1>
          <p>Personalize campos e listas usados nas negociações.</p>
        </div>
      </div>
      <PipelinesSection />
      <div style={{ height: 22 }} />
      <CustomFieldsSection />
      <div style={{ height: 22 }} />
      <ProductsSection />
      <div style={{ height: 22 }} />
      <QuestionnairesSection />
      <div style={{ height: 22 }} />
      <TemplatesSection />
      <div style={{ height: 22 }} />
      <CatalogSection title="Motivos de perda" endpoint="/loss-reasons" hint="Exibidos ao marcar uma negociação como perdida." />
      <div style={{ height: 22 }} />
      <CatalogSection title="Fontes" endpoint="/sources" hint="Origem da negociação (ex.: Indicação, Site, Evento)." />
      <div style={{ height: 22 }} />
      <CatalogSection title="Campanhas" endpoint="/campaigns" hint="Campanha de marketing associada." />
    </>
  );
}

function PipelinesSection() {
  const [items, setItems] = useState<Pipeline[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'SALES' | 'LEADS'>('SALES');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await api<Pipeline[]>('/pipelines'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Falha na operação'); }
  }
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void run(async () => { await api('/pipelines', { method: 'POST', body: { name: name.trim(), kind } }); setName(''); });
  };
  const setDefault = (p: Pipeline) => run(() => api(`/pipelines/${p.id}`, { method: 'PATCH', body: { isDefault: true } }));
  const rename = (p: Pipeline, newName: string) => newName !== p.name && run(() => api(`/pipelines/${p.id}`, { method: 'PATCH', body: { name: newName } }));
  const remove = (p: Pipeline) => { if (confirm(`Excluir o funil "${p.name}"?`)) void run(() => api(`/pipelines/${p.id}`, { method: 'DELETE' })); };

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>Funis</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Múltiplos funis de vendas e um funil de pré-vendas (Leads). Novos funis já vêm com etapas padrão.
      </p>
      <table className="table" style={{ marginBottom: 14 }}>
        <thead>
          <tr><th>Nome</th><th>Tipo</th><th>Etapas</th><th>Negócios</th><th>Padrão</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>
                <input defaultValue={p.name} onBlur={(e) => rename(p, e.target.value)}
                  style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 600 }} />
              </td>
              <td><span className="badge type">{p.kind === 'LEADS' ? 'Pré-vendas' : 'Vendas'}</span></td>
              <td>{p._count?.stages ?? 0}</td>
              <td>{p._count?.deals ?? 0}</td>
              <td>
                {p.isDefault ? <span className="status-pill WON">Padrão</span>
                  : p.kind === 'SALES' && <button className="btn btn-sm btn-ghost" onClick={() => setDefault(p)}>Tornar padrão</button>}
              </td>
              <td style={{ textAlign: 'right' }}>
                {!p.isDefault && <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>✕</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={add} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo funil…"
          style={{ flex: 1, minWidth: 180, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }} />
        <select value={kind} onChange={(e) => setKind(e.target.value as 'SALES' | 'LEADS')}>
          <option value="SALES">Vendas</option>
          <option value="LEADS">Pré-vendas (Leads)</option>
        </select>
        <button type="submit" className="btn btn-primary">+ Criar funil</button>
      </form>
    </div>
  );
}

function CustomFieldsSection() {
  const [entity, setEntity] = useState<CustomFieldEntity>('DEAL');
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [form, setForm] = useState({ label: '', type: 'TEXT' as CustomFieldType, options: '', required: false });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setDefs(await api<CustomFieldDef[]>(`/custom-fields?entity=${entity}`));
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/custom-fields', {
        method: 'POST',
        body: {
          entity,
          label: form.label,
          type: form.type,
          required: form.required,
          options:
            form.type === 'SELECT' || form.type === 'MULTISELECT'
              ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
              : [],
        },
      });
      setForm({ label: '', type: 'TEXT', options: '', required: false });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar campo');
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este campo personalizado?')) return;
    await api(`/custom-fields/${id}`, { method: 'DELETE' });
    await load();
  }

  const needsOptions = form.type === 'SELECT' || form.type === 'MULTISELECT';

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>Campos personalizados</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {ENTITIES.map((en) => (
          <button
            key={en.key}
            className={`btn btn-sm${entity === en.key ? ' btn-primary' : ''}`}
            onClick={() => setEntity(en.key)}
          >
            {en.label}
          </button>
        ))}
      </div>

      {defs.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nenhum campo para esta entidade.</p>
      ) : (
        <table className="table" style={{ marginBottom: 14 }}>
          <thead>
            <tr>
              <th>Rótulo</th>
              <th>Chave</th>
              <th>Tipo</th>
              <th>Obrig.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {defs.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.label}</td>
                <td className="muted"><span className="code-inline">{d.key}</span></td>
                <td>{TYPES.find((t) => t.key === d.type)?.label}</td>
                <td>{d.required ? 'Sim' : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(d.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <div className="form-error">{error}</div>}
      <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8, alignItems: 'end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Novo campo (rótulo)</label>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Tipo</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CustomFieldType })}>
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 9 }}>
          <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
          Obrigatório
        </label>
        {needsOptions && (
          <div className="field" style={{ margin: 0, gridColumn: '1 / -1' }}>
            <label>Opções (separadas por vírgula)</label>
            <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Ex.: Basic, Pro, Enterprise" />
          </div>
        )}
        <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>
          + Adicionar campo
        </button>
      </form>
    </div>
  );
}

function ProductsSection() {
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', code: '', price: '' });

  const load = useCallback(async () => { setItems(await api<Product[]>('/products')); }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api('/products', {
      method: 'POST',
      body: { name: form.name.trim(), code: form.code || undefined, unitPriceCents: Math.round(Number(form.price || '0') * 100) },
    });
    setForm({ name: '', code: '', price: '' });
    await load();
  }
  async function remove(id: string) {
    if (!confirm('Excluir este produto?')) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>Produtos e serviços</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Catálogo usado para montar os itens das negociações e propostas.</p>
      {items.length > 0 && (
        <table className="table" style={{ marginBottom: 14 }}>
          <thead><tr><th>Nome</th><th>Código</th><th>Preço</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td className="muted">{p.code ?? '—'}</td>
                <td>{formatMoney(p.unitPriceCents)}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Nome</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="field" style={{ margin: 0, width: 120 }}>
          <label>Código</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="field" style={{ margin: 0, width: 140 }}>
          <label>Preço (R$)</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary">+ Adicionar</button>
      </form>
    </div>
  );
}

function QuestionnairesSection() {
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [name, setName] = useState('');
  const [q, setQ] = useState<Record<string, string>>({});

  const load = useCallback(async () => { setItems(await api<Questionnaire[]>('/questionnaires')); }, []);
  useEffect(() => { load(); }, [load]);

  async function addQuestionnaire(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    await api('/questionnaires', { method: 'POST', body: { name: name.trim() } });
    setName(''); await load();
  }
  async function addQuestion(qid: string) {
    const text = (q[qid] ?? '').trim(); if (!text) return;
    await api(`/questionnaires/${qid}/questions`, { method: 'POST', body: { text } });
    setQ((s) => ({ ...s, [qid]: '' })); await load();
  }
  async function delQuestionnaire(id: string) { if (confirm('Excluir questionário?')) { await api(`/questionnaires/${id}`, { method: 'DELETE' }); await load(); } }
  async function delQuestion(id: string) { await api(`/questionnaires/questions/${id}`, { method: 'DELETE' }); await load(); }

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>Questionários de qualificação</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Perguntas para qualificar as negociações (respondidas na ficha do deal).</p>
      {items.map((qn) => (
        <div key={qn.id} className="card card-pad" style={{ marginBottom: 10, background: 'var(--surface-2)' }}>
          <div className="row-between"><strong>{qn.name}</strong><button className="btn btn-sm btn-danger" onClick={() => delQuestionnaire(qn.id)}>✕</button></div>
          <ul style={{ margin: '8px 0', paddingLeft: 18, fontSize: 14 }}>
            {qn.questions.map((qq) => (
              <li key={qq.id} style={{ marginBottom: 4 }}>{qq.text} <button className="btn-ghost" style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => delQuestion(qq.id)}>✕</button></li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Nova pergunta…" value={q[qn.id] ?? ''} onChange={(e) => setQ((s) => ({ ...s, [qn.id]: e.target.value }))}
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
            <button className="btn btn-sm" onClick={() => addQuestion(qn.id)}>+ Pergunta</button>
          </div>
        </div>
      ))}
      <form onSubmit={addQuestionnaire} style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo questionário…"
          style={{ flex: 1, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }} />
        <button type="submit" className="btn btn-primary">Criar</button>
      </form>
    </div>
  );
}

function TemplatesSection() {
  const [items, setItems] = useState<Template[]>([]);
  const [form, setForm] = useState({ name: '', type: 'EMAIL' as TemplateType, subject: '', body: '' });

  const load = useCallback(async () => { setItems(await api<Template[]>('/templates')); }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/templates', { method: 'POST', body: { name: form.name, type: form.type, subject: form.subject || undefined, body: form.body } });
    setForm({ name: '', type: 'EMAIL', subject: '', body: '' }); await load();
  }
  async function remove(id: string) { await api(`/templates/${id}`, { method: 'DELETE' }); await load(); }

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>Modelos de e-mail / proposta</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Use variáveis: <span className="code-inline">{'{{deal.title}}'}</span> <span className="code-inline">{'{{deal.amount}}'}</span> <span className="code-inline">{'{{company.name}}'}</span> <span className="code-inline">{'{{contact.firstName}}'}</span> <span className="code-inline">{'{{owner.name}}'}</span>
      </p>
      {items.map((t) => (
        <div key={t.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div><strong>{t.name}</strong> <span className="badge type">{t.type === 'EMAIL' ? 'E-mail' : 'Proposta'}</span></div>
          <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
      <form onSubmit={add} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}><label>Nome</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field" style={{ width: 140 }}><label>Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TemplateType })}>
              <option value="EMAIL">E-mail</option><option value="PROPOSAL">Proposta</option>
            </select>
          </div>
        </div>
        {form.type === 'EMAIL' && <div className="field"><label>Assunto</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>}
        <div className="field"><label>Corpo</label>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} required
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }} />
        </div>
        <button type="submit" className="btn btn-primary">+ Adicionar modelo</button>
      </form>
    </div>
  );
}

function CatalogSection({ title, endpoint, hint }: { title: string; endpoint: string; hint: string }) {
  const [items, setItems] = useState<Catalog[]>([]);
  const [label, setLabel] = useState('');

  const load = useCallback(async () => {
    setItems(await api<Catalog[]>(endpoint));
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await api(endpoint, { method: 'POST', body: { label: label.trim() } });
    setLabel('');
    await load();
  }
  async function remove(id: string) {
    await api(`${endpoint}/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="card card-pad">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{hint}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nenhum item.</span>}
        {items.map((it) => (
          <span key={it.id} className="badge type" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px' }}>
            {it.label}
            <button className="btn-ghost" style={{ border: 'none', background: 'none', color: 'var(--danger)', padding: 0, cursor: 'pointer' }} onClick={() => remove(it.id)}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Novo item…`}
          style={{ flex: 1, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }}
        />
        <button type="submit" className="btn btn-primary">Adicionar</button>
      </form>
    </div>
  );
}
