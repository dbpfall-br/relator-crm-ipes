import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { ACTIVITY_META, snoozeDate } from '../lib/activityMeta.js';
import type { Activity, TasksBuckets } from '../lib/types.js';

const buckets: { key: keyof TasksBuckets; label: string; badge: string }[] = [
  { key: 'overdue', label: 'Atrasadas', badge: 'overdue' },
  { key: 'today', label: 'Hoje', badge: 'today' },
  { key: 'upcoming', label: 'Futuras', badge: 'upcoming' },
];

export default function Tasks() {
  const [data, setData] = useState<TasksBuckets | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setData(await api<TasksBuckets>('/activities/tasks'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function complete(id: string) {
    await api(`/activities/${id}/complete`, { method: 'POST', body: {} });
    void load();
  }

  async function snooze(id: string, opt: '1h' | 'tomorrow' | 'nextweek') {
    await api(`/activities/${id}`, { method: 'PATCH', body: { dueAt: snoozeDate(opt) } });
    void load();
  }

  if (loading) return <div className="center-msg">Carregando tarefas…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tarefas</h1>
          <p>Seus follow-ups organizados por prazo.</p>
        </div>
      </div>
      <div className="tasks-grid">
        {buckets.map((b) => {
          const items = data?.[b.key] ?? [];
          return (
            <div key={b.key} className="card card-pad">
              <div className="row-between" style={{ marginBottom: 8 }}>
                <strong>{b.label}</strong>
                <span className={`badge ${b.badge}`}>{items.length}</span>
              </div>
              {items.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nada por aqui.</p>}
              {items.map((t: Activity) => (
                <div key={t.id} className="task-item">
                  <input
                    type="checkbox"
                    className="task-check"
                    onChange={() => complete(t.id)}
                    aria-label="Concluir"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      <span style={{ marginRight: 6 }} title={ACTIVITY_META[t.type].label}>
                        {ACTIVITY_META[t.type].icon}
                      </span>
                      {t.subject}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t.deal ? t.deal.title : t.contact ? t.contact.firstName : ''} · vence{' '}
                      {formatDate(t.dueAt)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                      <span className="muted" style={{ fontSize: 11, alignSelf: 'center' }}>Adiar:</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 7px' }} onClick={() => snooze(t.id, '1h')}>+1h</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 7px' }} onClick={() => snooze(t.id, 'tomorrow')}>amanhã</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 7px' }} onClick={() => snooze(t.id, 'nextweek')}>próx. sem.</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
