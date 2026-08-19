import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import type { Proposal, ProposalStatus } from '../lib/types.js';

const STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', ACCEPTED: 'Aceita', REJECTED: 'Recusada',
};
const STATUS_PILL: Record<ProposalStatus, string> = {
  DRAFT: 'type', SENT: 'upcoming', ACCEPTED: 'WON', REJECTED: 'LOST',
};

export default function DealProposals({ dealId }: { dealId: string }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await api<Proposal[]>(`/deals/${dealId}/proposals`));
  }, [dealId]);

  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(`/deals/${dealId}/proposals`, { method: 'POST', body: { title, intro: intro || undefined } });
      setCreating(false); setTitle(''); setIntro('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar proposta');
    }
  }

  async function setStatus(id: string, status: ProposalStatus) {
    await api(`/proposals/${id}/status`, { method: 'PATCH', body: { status } });
    await load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/p/${token}`;
    navigator.clipboard?.writeText(url).then(() => alert('Link público copiado:\n' + url), () => prompt('Link público:', url));
  }

  return (
    <div className="drawer-section">
      <h3>Propostas</h3>
      {items.length === 0 && !creating && <p className="muted" style={{ fontSize: 13 }}>Nenhuma proposta gerada.</p>}

      {items.map((p) => (
        <div key={p.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>{p.items.length} item(ns) · {formatMoney(p.totalCents)}</div>
            </div>
            <span className={`status-pill ${STATUS_PILL[p.status]}`}>{STATUS_LABEL[p.status]}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <a className="btn btn-sm btn-ghost" href={`/p/${p.publicToken}`} target="_blank" rel="noreferrer">👁 Ver</a>
            <button className="btn btn-sm btn-ghost" onClick={() => copyLink(p.publicToken)}>🔗 Link</button>
            {p.status === 'DRAFT' && <button className="btn btn-sm" onClick={() => setStatus(p.id, 'SENT')}>Marcar enviada</button>}
            {p.status !== 'ACCEPTED' && <button className="btn btn-sm" style={{ color: 'var(--success)' }} onClick={() => setStatus(p.id, 'ACCEPTED')}>Aceita</button>}
            {p.status !== 'REJECTED' && <button className="btn btn-sm btn-danger" onClick={() => setStatus(p.id, 'REJECTED')}>Recusada</button>}
          </div>
        </div>
      ))}

      {creating ? (
        <form onSubmit={create} className="card card-pad" style={{ marginTop: 8 }}>
          {error && <div className="form-error">{error}</div>}
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Proposta Comercial" />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Introdução (opcional)</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)' }} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-sm" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Gerar proposta</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setCreating(true)}>+ Gerar proposta (dos produtos)</button>
      )}
    </div>
  );
}
