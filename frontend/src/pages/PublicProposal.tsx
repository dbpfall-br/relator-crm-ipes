import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../lib/config.js';
import { formatMoney } from '../lib/format.js';
import type { PublicProposal as PublicProposalData } from '../lib/types.js';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', ACCEPTED: 'Aceita', REJECTED: 'Recusada',
};

// Visualização pública da proposta — acessível por link, sem autenticação.
export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicProposalData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/proposals/public/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [token]);

  if (error) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">Proposta não encontrada.</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">Carregando…</div>;

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', padding: 28 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>PROPOSTA COMERCIAL</div>
          <h1 style={{ margin: '6px 0 0' }}>{data.title}</h1>
          <div style={{ opacity: 0.9, marginTop: 6, fontSize: 14 }}>
            {data.companyName ? `${data.companyName} · ` : ''}{data.dealTitle}
          </div>
        </div>

        <div className="card-pad">
          {data.intro && <p style={{ fontSize: 15, lineHeight: 1.6 }}>{data.intro}</p>}

          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Item</th><th style={{ textAlign: 'right' }}>Qtd.</th><th style={{ textAlign: 'right' }}>Unit.</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {data.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.description}</td>
                  <td style={{ textAlign: 'right' }}>{i.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(i.unitPriceCents)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(i.quantity * i.unitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row-between" style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: 'var(--success)' }}>{formatMoney(data.totalCents)}</span>
          </div>

          <div style={{ marginTop: 18, fontSize: 13 }} className="muted">
            Status: <strong>{STATUS_LABEL[data.status] ?? data.status}</strong> · Emitida em{' '}
            {new Date(data.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 16 }}>Gerado por Relator CRM IPES</p>
    </div>
  );
}
