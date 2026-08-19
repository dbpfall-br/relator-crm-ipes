import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.js';
import type { Goal, ManagedUser, ReportsClosed, ReportsLive } from '../lib/types.js';

export default function Reports() {
  const [tab, setTab] = useState<'live' | 'closed' | 'goals'>('live');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analisar</h1>
          <p>Painel em tempo real e histórico de eventos.</p>
        </div>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button className={`btn btn-sm${tab === 'live' ? ' btn-primary' : ' btn-ghost'}`} style={{ borderRadius: 0, border: 'none' }} onClick={() => setTab('live')}>CRM Live</button>
          <button className={`btn btn-sm${tab === 'closed' ? ' btn-primary' : ' btn-ghost'}`} style={{ borderRadius: 0, border: 'none' }} onClick={() => setTab('closed')}>Histórico</button>
          <button className={`btn btn-sm${tab === 'goals' ? ' btn-primary' : ' btn-ghost'}`} style={{ borderRadius: 0, border: 'none' }} onClick={() => setTab('goals')}>Metas</button>
        </div>
      </div>
      {tab === 'live' && <CrmLive />}
      {tab === 'closed' && <ClosedReport />}
      {tab === 'goals' && <GoalsSection />}
    </>
  );
}

function GoalsSection() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState({ metric: 'WON_COUNT', target: '', userId: '' });

  const load = useCallback(async () => {
    const res = await api<{ goals: Goal[] }>(`/goals?period=${period}`);
    setGoals(res.goals);
  }, [period]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (canManage) api<ManagedUser[]>('/users').then(setUsers).catch(() => {}); }, [canManage]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/goals', { method: 'POST', body: { period, metric: form.metric, target: Number(form.target), userId: form.userId || null } });
    setForm({ metric: 'WON_COUNT', target: '', userId: '' });
    await load();
  }
  async function remove(id: string) { await api(`/goals/${id}`, { method: 'DELETE' }); await load(); }

  const fmt = (_g: Goal, v: number) => String(v);

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0 }}><label>Período</label><input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginTop: 0 }}>Metas do período</h3>
        {goals.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>Nenhuma meta definida.</p> : goals.map((g) => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div className="row-between" style={{ fontSize: 14, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>
                {g.user ? g.user.name : 'Time inteiro'} · Eventos com sucesso
              </span>
              <span className="muted">{fmt(g, g.actual)} / {fmt(g, g.target)} ({g.percent}%){canManage && <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => remove(g.id)}>✕</button>}</span>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 6, height: 12 }}>
              <div style={{ width: `${g.percent}%`, height: '100%', borderRadius: 6, background: g.percent >= 100 ? 'var(--success)' : 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
            </div>
          </div>
        ))}

        {canManage && (
          <form onSubmit={add} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Métrica</label>
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                <option value="WON_COUNT">Eventos com sucesso</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0, width: 140 }}><label>Alvo</label><input type="number" min="0" step="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required /></div>
            <div className="field" style={{ margin: 0 }}>
              <label>Responsável</label>
              <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Time inteiro</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Definir meta</button>
          </form>
        )}
      </div>
    </>
  );
}

interface FeedItem { id: number; text: string; time: string }

function CrmLive() {
  const [data, setData] = useState<ReportsLive | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const counter = useRef(0);

  const load = useCallback(() => { api<ReportsLive>('/reports/live').then(setData); }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    function push(text: string) {
      setFeed((f) => [{ id: counter.current++, text, time: new Date().toLocaleTimeString('pt-BR') }, ...f].slice(0, 20));
      load();
    }
    const handlers: Record<string, (p: any) => void> = {
      'deal:created': (d) => push(`🆕 Nova negociação: ${d?.title ?? ''}`),
      'deal:moved': (p) => push(`↔️ "${p?.deal?.title ?? ''}" movida para ${p?.deal?.stage?.name ?? ''}`),
      'deal:updated': (d) => push(`✏️ Atualizada: ${d?.title ?? ''} (${d?.status ?? ''})`),
      'deal:deleted': () => push('🗑️ Negociação removida'),
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
  }, [load]);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="label">Criadas hoje</div><div className="value">{data?.createdToday ?? '—'}</div></div>
        <div className="kpi"><div className="label">Sucesso hoje</div><div className="value" style={{ color: 'var(--success)' }}>{data?.wonToday.count ?? '—'}</div></div>
        <div className="kpi"><div className="label">Insucesso hoje</div><div className="value" style={{ color: 'var(--danger)' }}>{data?.lostToday.count ?? '—'}</div></div>
        <div className="kpi"><div className="label">Em aberto (total)</div><div className="value">{data?.open.count ?? '—'}</div></div>
      </div>
      <div className="card card-pad">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Feed em tempo real</h3>
          <span className="live-dot">ao vivo</span>
        </div>
        {feed.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Aguardando eventos… (crie ou mova uma negociação para ver aqui)</p>
        ) : (
          feed.map((f) => (
            <div key={f.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span>{f.text}</span>
              <span className="muted" style={{ fontSize: 12 }}>{f.time}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ClosedReport() {
  const today = new Date();
  const ago = new Date(today.getTime() - 90 * 86400000);
  const [from, setFrom] = useState(ago.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [data, setData] = useState<ReportsClosed | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ from, to: `${to}T23:59:59` });
    setData(await api<ReportsClosed>(`/reports/closed?${p.toString()}`));
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const maxMonth = Math.max(1, ...(data?.byMonth.map((m) => m.wonCount) ?? [1]));

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0 }}><label>De</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field" style={{ margin: 0 }}><label>Até</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {data && (
        <>
          <div className="kpi-grid">
            <div className="kpi"><div className="label">Com sucesso</div><div className="value" style={{ color: 'var(--success)' }}>{data.totals.wonCount}</div></div>
            <div className="kpi"><div className="label">Sem sucesso</div><div className="value" style={{ color: 'var(--danger)' }}>{data.totals.lostCount}</div></div>
            <div className="kpi"><div className="label">Taxa de sucesso</div><div className="value">{data.totals.winRate}%</div></div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Eventos com sucesso por mês</h3>
            {data.byMonth.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>Sem eventos concluídos no período.</p> : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, paddingTop: 10 }}>
                {data.byMonth.map((m) => (
                  <div key={m.month} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <div className="muted" style={{ fontSize: 11 }}>{m.wonCount}</div>
                    <div style={{ height: `${(m.wonCount / maxMonth) * 130}px`, background: 'linear-gradient(180deg, #6366f1, #a855f7)', borderRadius: '6px 6px 0 0', marginTop: 4 }} />
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{m.month}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <table className="table">
              <thead><tr><th>Responsável</th><th>Com sucesso</th><th>Sem sucesso</th><th>Taxa de sucesso</th></tr></thead>
              <tbody>
                {data.byOwner.length === 0 ? (
                  <tr><td colSpan={4} className="muted">Sem dados.</td></tr>
                ) : data.byOwner.map((o) => {
                  const total = o.wonCount + o.lostCount;
                  const rate = total > 0 ? Math.round((o.wonCount / total) * 100) : 0;
                  return (
                    <tr key={o.ownerId}>
                      <td style={{ fontWeight: 600 }}>{o.name}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{o.wonCount}</td>
                      <td style={{ color: 'var(--danger)' }}>{o.lostCount}</td>
                      <td>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
