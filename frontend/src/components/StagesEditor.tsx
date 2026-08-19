import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import Modal from './Modal.js';
import type { Stage } from '../lib/types.js';

interface Props {
  pipelineId?: string;
  onClose: () => void;
  onChanged: () => void; // recarrega o board ao alterar etapas
}

export default function StagesEditor({ pipelineId, onClose, onChanged }: Props) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const qs = pipelineId ? `?pipelineId=${pipelineId}` : '';
  const load = useCallback(async () => {
    setStages(await api<Stage[]>(`/stages${qs}`));
  }, [qs]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha na operação');
    }
  }

  const rename = (s: Stage, name: string) =>
    run(() => api(`/stages/${s.id}`, { method: 'PATCH', body: { name } }));

  const removeStage = (s: Stage) => {
    if (!confirm(`Excluir a etapa "${s.name}"?`)) return;
    void run(() => api(`/stages/${s.id}`, { method: 'DELETE' }));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const ordered = [...stages];
    const [item] = ordered.splice(index, 1);
    ordered.splice(target, 0, item!);
    void run(() => api('/stages/reorder', { method: 'POST', body: { orderedIds: ordered.map((s) => s.id), pipelineId } }));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    void run(async () => {
      await api('/stages', { method: 'POST', body: { name: newName.trim(), pipelineId } });
      setNewName('');
    });
  };

  return (
    <Modal title="Editar etapas do funil" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p className="muted">Carregando…</p>
      ) : (
        <>
          {stages.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} title="Subir">
                  ▲
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={i === stages.length - 1}
                  onClick={() => move(i, 1)}
                  title="Descer"
                >
                  ▼
                </button>
              </div>
              <input
                defaultValue={s.name}
                onBlur={(e) => e.target.value !== s.name && rename(s, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              />
              <span className="muted" style={{ fontSize: 12, width: 62, textAlign: 'right' }}>
                {s._count?.deals ?? 0} deal(s)
              </span>
              <button className="btn btn-sm btn-danger" onClick={() => removeStage(s)}>
                ✕
              </button>
            </div>
          ))}

          <form onSubmit={add} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <input
              placeholder="Nova etapa…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 11px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
                color: 'var(--text)',
              }}
            />
            <button type="submit" className="btn btn-primary">
              Adicionar
            </button>
          </form>
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Renomeie clicando no nome. Reordene com ▲▼. Só é possível excluir etapas sem negociações.
          </p>
        </>
      )}
    </Modal>
  );
}
