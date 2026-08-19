import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { api, ApiError } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { QUALIFICATION_META } from '../lib/activityMeta.js';
import type { Board as BoardType, Catalog, Deal, DealQualification, Pipeline } from '../lib/types.js';
import Modal from '../components/Modal.js';
import DealDetail from '../components/DealDetail.js';
import StagesEditor from '../components/StagesEditor.js';
import CustomFieldsForm from '../components/CustomFieldsForm.js';
import DealsList from '../components/DealsList.js';
import { useAuth } from '../context/AuthContext.js';

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { stageId: deal.stageId },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`deal-card${isDragging ? ' dragging' : ''}`}
      onClick={() => onOpen(deal.id)}
      {...listeners}
      {...attributes}
    >
      <div className="title">{deal.title}</div>
      <div className="meta">
        <span>{deal.company?.name ?? deal.contact?.firstName ?? 'Sem vínculo'}</span>
        <span>{deal.owner.name.split(' ')[0]}</span>
      </div>
    </div>
  );
}

function Column({
  stageId,
  name,
  deals,
  onOpen,
}: {
  stageId: string;
  name: string;
  deals: Deal[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div className="column">
      <div className="column-head">
        <span>{name}</span>
        <span className="count">{deals.length}</span>
      </div>
      <div ref={setNodeRef} className={`column-body${isOver ? ' drop-over' : ''}`}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function Board() {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editStages, setEditStages] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [live, setLive] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string>('');
  const { user } = useAuth();
  const canEditStages = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Carrega os funis (seletor). Seleciona o padrão / primeiro.
  useEffect(() => {
    api<Pipeline[]>('/pipelines').then((ps) => {
      setPipelines(ps);
      if (ps.length > 0) setPipelineId((cur) => cur || ps.find((p) => p.isDefault)?.id || ps[0]!.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!pipelineId) return;
    const data = await api<BoardType>(`/deals/board?pipelineId=${pipelineId}`);
    setBoard(data);
  }, [pipelineId]);

  useEffect(() => {
    if (pipelineId) load().finally(() => setLoading(false));
  }, [load, pipelineId]);

  // Tempo real: qualquer alteração no pipeline recarrega o board.
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => void load();
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setLive(socket.connected);
    const events = ['deal:created', 'deal:updated', 'deal:moved', 'deal:deleted', 'stage:changed'];
    events.forEach((ev) => socket.on(ev, refresh));
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      events.forEach((ev) => socket.off(ev, refresh));
    };
  }, [load]);

  const activeId = useRef<string | null>(null);
  function onDragStart(e: DragStartEvent) {
    activeId.current = String(e.active.id);
  }

  async function onDragEnd(e: DragEndEvent) {
    activeId.current = null;
    const dealId = String(e.active.id);
    const targetStageId = e.over ? String(e.over.id) : null;
    const fromStageId = e.active.data.current?.stageId as string | undefined;
    if (!targetStageId || !board || targetStageId === fromStageId) return;

    // Atualização otimista: move o card localmente antes da confirmação do servidor.
    setBoard((prev) => {
      if (!prev) return prev;
      let moved: Deal | undefined;
      const columns = prev.columns.map((col) => {
        const idx = col.deals.findIndex((d) => d.id === dealId);
        if (idx >= 0) {
          moved = col.deals[idx];
          return { ...col, deals: col.deals.filter((d) => d.id !== dealId) };
        }
        return col;
      });
      if (moved) {
        const target = columns.find((c) => c.stage.id === targetStageId);
        if (target) {
          const updated = { ...moved, stageId: targetStageId, stage: target.stage };
          target.deals = [updated, ...target.deals];
        }
      }
      return { ...prev, columns };
    });

    try {
      await api(`/deals/${dealId}/move`, {
        method: 'POST',
        body: { stageId: targetStageId, position: 0 },
      });
      // O evento 'deal:moved' via socket sincroniza o estado final.
    } catch {
      void load(); // rollback: recarrega estado real
    }
  }

  if (loading) return <div className="center-msg">Carregando pipeline…</div>;
  if (!board) return <div className="center-msg">Nenhum pipeline encontrado.</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pipelines.length > 1 ? (
              <select
                value={pipelineId}
                onChange={(e) => { setPipelineId(e.target.value); setLoading(true); }}
                style={{ fontSize: 20, fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.kind === 'LEADS' ? ' (Leads)' : ''}</option>
                ))}
              </select>
            ) : (
              <h1>{board.pipeline.name}</h1>
            )}
            {board.pipeline.kind === 'LEADS' && <span className="badge upcoming">Pré-vendas</span>}
          </div>
          <p>
            {board.pipeline.kind === 'LEADS' ? 'Qualifique os leads e converta em negociação.' : 'Arraste os cards entre as etapas.'}{' '}
            {live && <span className="live-dot">ao vivo</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              className={`btn btn-sm${view === 'kanban' ? ' btn-primary' : ' btn-ghost'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setView('kanban')}
            >
              Kanban
            </button>
            <button
              className={`btn btn-sm${view === 'list' ? ' btn-primary' : ' btn-ghost'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setView('list')}
            >
              Lista
            </button>
          </div>
          {canEditStages && (
            <button className="btn" onClick={() => setEditStages(true)}>
              ⚙️ Editar etapas
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            {board.pipeline.kind === 'LEADS' ? '+ Novo lead' : '+ Nova negociação'}
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="board">
            {board.columns.map((col) => (
              <Column
                key={col.stage.id}
                stageId={col.stage.id}
                name={col.stage.name}
                deals={col.deals}
                onOpen={setSelectedId}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <DealsList onOpen={setSelectedId} pipelineId={pipelineId} />
      )}

      {showNew && (
        <NewDealModal
          pipelineId={pipelineId}
          isLeads={board.pipeline.kind === 'LEADS'}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load();
          }}
        />
      )}

      {selectedId && (
        <DealDetail
          dealId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}

      {editStages && (
        <StagesEditor pipelineId={pipelineId} onClose={() => setEditStages(false)} onChanged={() => void load()} />
      )}
    </>
  );
}

function NewDealModal({
  pipelineId,
  isLeads,
  onClose,
  onCreated,
}: {
  pipelineId: string;
  isLeads: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [qualification, setQualification] = useState<DealQualification>('NONE');
  const [sourceId, setSourceId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [sources, setSources] = useState<Catalog[]>([]);
  const [campaigns, setCampaigns] = useState<Catalog[]>([]);
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Catalog[]>('/sources').then(setSources).catch(() => {});
    api<Catalog[]>('/campaigns').then(setCampaigns).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api('/deals', {
        method: 'POST',
        body: {
          title,
          amountCents: 0,
          qualification,
          sourceId: sourceId || undefined,
          campaignId: campaignId || undefined,
          pipelineId: pipelineId || undefined,
          customFields: custom,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a negociação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isLeads ? 'Novo lead' : 'Nova negociação'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Qualificação</label>
          <select value={qualification} onChange={(e) => setQualification(e.target.value as DealQualification)}>
            {(Object.keys(QUALIFICATION_META) as DealQualification[]).map((q) => (
              <option key={q} value={q}>{QUALIFICATION_META[q].label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Fonte</label>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Campanha</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <CustomFieldsForm entity="DEAL" values={custom} onChange={setCustom} />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
