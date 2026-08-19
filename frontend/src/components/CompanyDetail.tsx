import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ACTIVITY_META } from '../lib/activityMeta.js';
import type { CompanyDashboard } from '../lib/types.js';

interface Props {
  companyId: string;
  onClose: () => void;
  onOpenDeal?: (id: string) => void;
}

// Drawer de "conta": mini-dashboard agregado + negociações + histórico unificado.
export default function CompanyDetail({ companyId, onClose, onOpenDeal }: Props) {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<CompanyDashboard>(`/companies/${companyId}/dashboard`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>← Fechar</button>

        {loading || !data ? (
          <p className="muted" style={{ marginTop: 30 }}>Carregando…</p>
        ) : (
          <>
            <div style={{ marginTop: 14 }}>
              <h2 style={{ margin: 0 }}>{data.company.name}</h2>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {[data.company.industry, data.company.website].filter(Boolean).join(' · ') || 'Sem detalhes'}
              </div>
            </div>

            {/* Mini-dashboard */}
            <div className="drawer-section">
              <h3>Visão consolidada</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kpi label="Em andamento" value={String(data.metrics.openCount)} sub="aberta(s)" />
                <Kpi label="Ganhas" value={String(data.metrics.wonCount)} color="var(--success)" sub="ganha(s)" />
                <Kpi label="Perdidas" value={String(data.metrics.lostCount)} color="var(--danger)" sub="perdida(s)" />
                <Kpi
                  label="Tempo médio até venda"
                  value={data.metrics.avgDaysToWin != null ? `${data.metrics.avgDaysToWin} dias` : '—'}
                />
                <Kpi label="Contatos" value={String(data.company.contacts.length)} />
              </div>
            </div>

            {/* Negociações */}
            <div className="drawer-section">
              <h3>Negociações ({data.deals.length})</h3>
              {data.deals.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Nenhuma negociação.</p>
              ) : (
                data.deals.map((d) => (
                  <div
                    key={d.id}
                    className="row-between"
                    style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: onOpenDeal ? 'pointer' : 'default' }}
                    onClick={() => onOpenDeal?.(d.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{d.stage.name} · {d.owner.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-pill ${d.status}`} style={{ fontSize: 10 }}>{d.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Histórico consolidado */}
            <div className="drawer-section">
              <h3>Histórico</h3>
              {data.timeline.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Sem atividades registradas.</p>
              ) : (
                <div className="timeline" style={{ marginTop: 6 }}>
                  {data.timeline.map((a) => (
                    <div key={a.id} className={`timeline-item${a.done ? ' done' : ''}`}>
                      <div className="t-subject">
                        <span style={{ marginRight: 6 }} title={ACTIVITY_META[a.type].label}>{ACTIVITY_META[a.type].icon}</span>
                        {a.subject}
                      </div>
                      <div className="t-meta">
                        {a.deal ? `${a.deal.title} · ` : ''}{a.notes ?? ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: color ?? 'var(--text)' }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
