import { useCallback, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api.js';
import { API_BASE } from '../lib/config.js';
import { formatDate } from '../lib/format.js';
import { QUALIFICATION_META } from '../lib/activityMeta.js';
import type { Deal, Paginated, SavedFilter, Stage } from '../lib/types.js';

interface Props {
  onOpen: (id: string) => void;
  pipelineId?: string;
}

type Filters = {
  q: string;
  status: string;
  stageId: string;
  withoutTask: boolean;
  sort: string;
  order: string;
};

const EMPTY: Filters = { q: '', status: '', stageId: '', withoutTask: false, sort: 'created', order: 'desc' };

// Serializa os filtros em querystring para a API.
function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.status) p.set('status', f.status);
  if (f.stageId) p.set('stageId', f.stageId);
  if (f.withoutTask) p.set('withoutTask', 'true');
  p.set('sort', f.sort);
  p.set('order', f.order);
  p.set('pageSize', '100');
  return p.toString();
}

export default function DealsList({ onOpen, pipelineId }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);

  const pipeQs = pipelineId ? `&pipelineId=${pipelineId}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<Paginated<Deal>>(`/deals?${toQuery(filters)}${pipeQs}`);
    setDeals(res.items);
    setLoading(false);
  }, [filters, pipeQs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<Stage[]>(`/stages${pipelineId ? `?pipelineId=${pipelineId}` : ''}`).then(setStages).catch(() => {});
    void reloadSaved();
  }, [pipelineId]);

  async function reloadSaved() {
    setSaved(await api<SavedFilter[]>('/saved-filters'));
  }

  async function saveCurrent() {
    const name = prompt('Nome do filtro salvo:');
    if (!name) return;
    await api('/saved-filters', { method: 'POST', body: { name, query: filters as unknown as Record<string, string> } });
    void reloadSaved();
  }

  async function deleteSaved(id: string) {
    await api(`/saved-filters/${id}`, { method: 'DELETE' });
    void reloadSaved();
  }

  // Export CSV autenticado → download via blob.
  async function exportCsv() {
    const res = await fetch(`${API_BASE}/deals/export.csv?${toQuery(filters)}${pipeQs}`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'negociacoes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      {/* Barra de filtros */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Buscar</label>
          <input value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="Título…" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Status</label>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Todos</option>
            <option value="OPEN">Em aberto</option>
            <option value="WON">Ganhas</option>
            <option value="LOST">Perdidas</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Etapa</label>
          <select value={filters.stageId} onChange={(e) => set({ stageId: e.target.value })}>
            <option value="">Todas</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Ordenar por</label>
          <select value={`${filters.sort}:${filters.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(':'); set({ sort, order }); }}>
            <option value="created:desc">Mais recentes</option>
            <option value="created:asc">Mais antigas</option>
            <option value="closeDate:asc">Fechamento próximo</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 9 }}>
          <input type="checkbox" checked={filters.withoutTask} onChange={(e) => set({ withoutTask: e.target.checked })} />
          Sem tarefa
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => setFilters(EMPTY)}>Limpar</button>
        <button className="btn btn-sm" onClick={saveCurrent}>💾 Salvar filtro</button>
        <button className="btn btn-sm" onClick={exportCsv}>⬇️ Exportar CSV</button>
      </div>

      {/* Filtros salvos */}
      {saved.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Salvos:</span>
          {saved.map((sf) => (
            <span key={sf.id} className="badge upcoming" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', cursor: 'pointer' }}>
              <span onClick={() => setFilters({ ...EMPTY, ...(sf.query as unknown as Filters) })}>{sf.name}</span>
              <button style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }} onClick={() => deleteSaved(sf.id)}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="card">
        {loading ? (
          <div className="card-pad muted">Carregando…</div>
        ) : deals.length === 0 ? (
          <div className="card-pad muted">Nenhuma negociação encontrada.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Negociação</th>
                <th>Etapa</th>
                <th>Status</th>
                <th>Qualif.</th>
                <th>Responsável</th>
                <th>Fechamento</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(d.id)}>
                  <td style={{ fontWeight: 600 }}>
                    {d.title}
                    <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{d.company?.name ?? ''}</div>
                  </td>
                  <td>{d.stage.name}</td>
                  <td><span className={`status-pill ${d.status}`}>{d.status}</span></td>
                  <td style={{ color: QUALIFICATION_META[d.qualification].color, fontSize: 13 }}>
                    {QUALIFICATION_META[d.qualification].label}
                  </td>
                  <td className="muted">{d.owner.name.split(' ')[0]}</td>
                  <td className="muted">{formatDate(d.expectedCloseDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
