import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { DashboardSummary } from '../lib/types.js';

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardSummary>('/dashboard/summary')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="center-msg">Carregando dashboard…</div>;
  if (!data) return <div className="center-msg">Sem dados.</div>;

  const maxStageCount = Math.max(1, ...data.byStage.map((s) => s.count));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral dos seus eventos.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Em aberto</div>
          <div className="value">{data.counts.open}</div>
        </div>
        <div className="kpi">
          <div className="label">Com sucesso</div>
          <div className="value" style={{ color: 'var(--success)' }}>
            {data.counts.won}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Sem sucesso</div>
          <div className="value" style={{ color: 'var(--danger)' }}>
            {data.counts.lost}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Taxa de sucesso</div>
          <div className="value">{data.winRate}%</div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginTop: 0 }}>Etapas (em aberto)</h3>
        {data.byStage.length === 0 && <p className="muted">Nenhuma negociação em aberto.</p>}
        {data.byStage.map((s) => (
          <div key={s.stageId} style={{ marginBottom: 14 }}>
            <div className="row-between" style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{s.stageName}</span>
              <span className="muted">{s.count} negociação{s.count !== 1 ? 'ões' : ''}</span>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 6, height: 10 }}>
              <div
                style={{
                  width: `${(s.count / maxStageCount) * 100}%`,
                  minWidth: s.count > 0 ? 6 : 0,
                  height: '100%',
                  borderRadius: 6,
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
