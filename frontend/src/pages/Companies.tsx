import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import Modal from '../components/Modal.js';
import CustomFieldsForm from '../components/CustomFieldsForm.js';
import CompanyDetail from '../components/CompanyDetail.js';
import type { Company, Paginated } from '../lib/types.js';

export default function Companies() {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    const res = await api<Paginated<Company>>(
      `/companies?q=${encodeURIComponent(search)}`,
    );
    setItems(res.items);
  }, []);

  useEffect(() => {
    load(q).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    void load(q);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Empresas</h1>
          <p>Contas e organizações do seu CRM.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Nova empresa
        </button>
      </div>

      <form onSubmit={onSearch} style={{ marginBottom: 16, maxWidth: 320 }}>
        <input
          className="field"
          style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}
          placeholder="Buscar empresa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="card-pad muted">Nenhuma empresa cadastrada.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Setor</th>
                <th>Website</th>
                <th>Contatos</th>
                <th>Negócios</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.industry ?? '—'}</td>
                  <td className="muted">{c.website ?? '—'}</td>
                  <td>{c._count?.contacts ?? 0}</td>
                  <td>{c._count?.deals ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewCompanyModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load(q);
          }}
        />
      )}

      {selectedId && (
        <CompanyDetail companyId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

function NewCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', industry: '', website: '', phone: '' });
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/companies', {
        method: 'POST',
        body: {
          name: form.name,
          industry: form.industry || undefined,
          website: form.website || undefined,
          phone: form.phone || undefined,
          customFields: custom,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar. Verifique os campos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova empresa" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Nome *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>
        <div className="field">
          <label>Setor</label>
          <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </div>
        <div className="field">
          <label>Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://exemplo.com"
          />
        </div>
        <div className="field">
          <label>Telefone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <CustomFieldsForm entity="COMPANY" values={custom} onChange={setCustom} />
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
