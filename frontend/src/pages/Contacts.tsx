import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import Modal from '../components/Modal.js';
import CustomFieldsForm from '../components/CustomFieldsForm.js';
import { initials } from '../lib/format.js';
import type { Company, Contact, Paginated } from '../lib/types.js';

export default function Contacts() {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async (search: string) => {
    const res = await api<Paginated<Contact>>(`/contacts?q=${encodeURIComponent(search)}`);
    setItems(res.items);
  }, []);

  useEffect(() => {
    load(q).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Contatos</h1>
          <p>Pessoas com quem você faz negócio.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Novo contato
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
        style={{ marginBottom: 16, maxWidth: 320 }}
      >
        <input
          style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
          placeholder="Buscar contato…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="card-pad muted">Nenhum contato cadastrado.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Empresa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{initials(`${c.firstName} ${c.lastName ?? ''}`)}</div>
                      <span style={{ fontWeight: 600 }}>
                        {c.firstName} {c.lastName ?? ''}
                      </span>
                    </div>
                  </td>
                  <td>{c.jobTitle ?? '—'}</td>
                  <td className="muted">{c.email ?? '—'}</td>
                  <td>{c.company?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewContactModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load(q);
          }}
        />
      )}
    </>
  );
}

function NewContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', jobTitle: '', companyId: '' });
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Paginated<Company>>('/companies?pageSize=100').then((r) => setCompanies(r.items));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/contacts', {
        method: 'POST',
        body: {
          firstName: form.firstName,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          jobTitle: form.jobTitle || undefined,
          companyId: form.companyId || undefined,
          customFields: custom,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Verifique o e-mail informado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo contato" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Nome *</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required autoFocus />
        </div>
        <div className="field">
          <label>Sobrenome</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Cargo</label>
          <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
        </div>
        <div className="field">
          <label>Empresa</label>
          <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">— Nenhuma —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <CustomFieldsForm entity="CONTACT" values={custom} onChange={setCustom} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
