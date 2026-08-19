import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { Template } from '../lib/types.js';

// Renderiza um modelo de e-mail com os dados da negociação, para copiar/colar.
export default function DealEmailTemplate({ dealId }: { dealId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState<{ subject: string | null; body: string } | null>(null);

  useEffect(() => {
    api<Template[]>('/templates?type=EMAIL').then(setTemplates).catch(() => {});
  }, []);

  if (templates.length === 0) return null;

  async function pick(id: string) {
    if (!id) { setRendered(null); return; }
    setRendered(await api(`/templates/${id}/render?dealId=${dealId}`));
  }

  return (
    <div className="drawer-section">
      <h3>Modelo de e-mail</h3>
      {!open ? (
        <button className="btn btn-sm" onClick={() => setOpen(true)}>✉️ Gerar e-mail de um modelo</button>
      ) : (
        <>
          <div className="field">
            <select onChange={(e) => pick(e.target.value)} defaultValue="">
              <option value="">— escolha um modelo —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {rendered && (
            <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
              {rendered.subject && <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Assunto:</strong> {rendered.subject}</div>}
              <textarea readOnly value={rendered.body} rows={6}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
              <button className="btn btn-sm" style={{ marginTop: 8 }}
                onClick={() => navigator.clipboard?.writeText((rendered.subject ? rendered.subject + '\n\n' : '') + rendered.body).then(() => alert('E-mail copiado!'))}>
                📋 Copiar
              </button>
            </div>
          )}
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => { setOpen(false); setRendered(null); }}>Fechar</button>
        </>
      )}
    </div>
  );
}
