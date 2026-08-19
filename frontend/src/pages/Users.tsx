import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import Modal from '../components/Modal.js';
import { initials } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.js';
import type { ManagedUser, Role } from '../lib/types.js';

const roles: Role[] = ['ADMIN', 'MANAGER', 'SALES'];

export default function Users() {
  const { user: me } = useAuth();
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await api<ManagedUser[]>('/users'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na operação');
    }
  }

  const changeRole = (u: ManagedUser, role: Role) =>
    run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role } }));
  const toggleActive = (u: ManagedUser) =>
    run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } }));
  const remove = (u: ManagedUser) => {
    if (!confirm(`Excluir o usuário ${u.name} (${u.email})?`)) return;
    void run(() => api(`/users/${u.id}`, { method: 'DELETE' }));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Usuários</h1>
          <p>Vendedores e gestores com acesso ao CRM.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Novo usuário
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Carregando…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Vínculos</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{initials(u.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {u.name} {isMe && <span className="muted">(você)</span>}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        style={{
                          padding: '5px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--surface-2)',
                          color: 'var(--text)',
                        }}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status-pill ${u.isActive ? 'WON' : 'LOST'}`}>
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {u._count?.ownedDeals ?? 0} deals · {u._count?.activities ?? 0} atividades
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={isMe}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={isMe}
                        onClick={() => remove(u)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewUserModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load();
          }}
        />
      )}
    </>
  );
}

function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES' as Role });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/users', { method: 'POST', body: form });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo usuário" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Nome *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>
        <div className="field">
          <label>E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="field">
          <label>Senha * (mín. 8 caracteres)</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label>Papel</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
