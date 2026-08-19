import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { ACTIVITY_META, ACTIVITY_TYPES, QUALIFICATION_META, snoozeDate } from '../lib/activityMeta.js';
import CustomFieldsForm from './CustomFieldsForm.js';
import DealProducts from './DealProducts.js';
import DealProposals from './DealProposals.js';
import DealQuestionnaires from './DealQuestionnaires.js';
import DealEmailTemplate from './DealEmailTemplate.js';
import type { Activity, ActivityType, Catalog, Deal, DealQualification } from '../lib/types.js';

interface Props {
  dealId: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function DealDetail({ dealId, onClose, onChanged }: Props) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [losing, setLosing] = useState(false);
  const [lossReasons, setLossReasons] = useState<Catalog[]>([]);
  const [lossReasonId, setLossReasonId] = useState('');

  const load = useCallback(async () => {
    const [d, acts] = await Promise.all([
      api<Deal>(`/deals/${dealId}`),
      api<{ items: Activity[] }>(`/activities?dealId=${dealId}`),
    ]);
    setDeal(d);
    setActivities(acts.items);
  }, [dealId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function close(won: boolean, reasonId?: string) {
    await api(`/deals/${dealId}/${won ? 'win' : 'lose'}`, {
      method: 'POST',
      body: won ? {} : { lossReasonId: reasonId || undefined },
    });
    setLosing(false);
    await load();
    onChanged();
  }

  async function startLose() {
    if (lossReasons.length === 0) setLossReasons(await api<Catalog[]>('/loss-reasons'));
    setLosing(true);
  }

  async function remove() {
    if (!confirm('Excluir esta negociação? Esta ação não pode ser desfeita.')) return;
    await api(`/deals/${dealId}`, { method: 'DELETE' });
    onChanged();
    onClose();
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>← Fechar</button>
          <button className="btn btn-danger btn-sm" onClick={remove}>Excluir</button>
        </div>

        {loading || !deal ? (
          <p className="muted" style={{ marginTop: 30 }}>Carregando…</p>
        ) : (
          <>
            {editing ? (
              <EditForm
                deal={deal}
                onCancel={() => setEditing(false)}
                onSaved={async () => { setEditing(false); await load(); onChanged(); }}
              />
            ) : (
              <div style={{ marginTop: 16 }}>
                <div className="row-between">
                  <h2>{deal.title}</h2>
                  <span className={`status-pill ${deal.status}`}>{deal.status}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
                  Etapa: <strong>{deal.stage.name}</strong> · Responsável: {deal.owner.name}<br />
                  Qualificação:{' '}
                  <strong style={{ color: QUALIFICATION_META[deal.qualification].color }}>
                    {QUALIFICATION_META[deal.qualification].label}
                  </strong><br />
                  Fechamento previsto: {formatDate(deal.expectedCloseDate)}<br />
                  {deal.company && <>Empresa: {deal.company.name}<br /></>}
                  {deal.source && <>Fonte: {deal.source.label}<br /></>}
                  {deal.campaign && <>Campanha: {deal.campaign.label}<br /></>}
                  {deal.status === 'LOST' && deal.lossReason && (
                    <span style={{ color: 'var(--danger)' }}>Motivo da perda: {deal.lossReason.label}</span>
                  )}
                </div>

                {Object.keys(deal.customFields ?? {}).length > 0 && (
                  <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                    {Object.entries(deal.customFields).map(([k, v]) => (
                      <div key={k}><strong>{k}:</strong> {Array.isArray(v) ? v.join(', ') : String(v)}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>
                  {deal.pipeline?.kind === 'LEADS' && deal.status === 'OPEN' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={async () => { await api(`/deals/${dealId}/convert`, { method: 'POST' }); onChanged(); onClose(); }}
                    >
                      → Converter em negociação
                    </button>
                  )}
                  {deal.pipeline?.kind !== 'LEADS' && deal.status === 'OPEN' && (
                    <>
                      <button className="btn btn-sm" style={{ color: 'var(--success)', borderColor: 'var(--success-soft)' }} onClick={() => close(true)}>✓ Sucesso</button>
                      <button className="btn btn-sm btn-danger" onClick={startLose}>✕ Insucesso</button>
                    </>
                  )}
                </div>

                {losing && (
                  <div className="card card-pad" style={{ marginTop: 12 }}>
                    <div className="field" style={{ marginBottom: 8 }}>
                      <label>Motivo da perda</label>
                      <select value={lossReasonId} onChange={(e) => setLossReasonId(e.target.value)}>
                        <option value="">— não informar —</option>
                        {lossReasons.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-sm" onClick={() => setLosing(false)}>Cancelar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => close(false, lossReasonId)}>Registrar insucesso</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {deal && deal.pipeline?.kind !== 'LEADS' && (
              <>
                <DealProducts dealId={dealId} onChanged={load} />
                <DealProposals dealId={dealId} />
              </>
            )}
            {deal && <DealQuestionnaires dealId={dealId} />}
            {deal && <DealEmailTemplate dealId={dealId} />}

            <div className="drawer-section">
              <h3>Timeline de atividades</h3>
              <AddActivity dealId={dealId} onAdded={load} />
              {activities.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Nenhuma atividade registrada ainda.</p>
              ) : (
                <div className="timeline" style={{ marginTop: 14 }}>
                  {activities.map((a) => (
                    <TimelineItem key={a.id} activity={a} onChanged={load} />
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

function TimelineItem({ activity: a, onChanged }: { activity: Activity; onChanged: () => void }) {
  const [completing, setCompleting] = useState(false);
  const [note, setNote] = useState('');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const meta = ACTIVITY_META[a.type];

  async function complete() {
    await api(`/activities/${a.id}/complete`, { method: 'POST', body: { note: note || undefined } });
    setCompleting(false);
    setNote('');
    onChanged();
  }
  async function snooze(opt: '1h' | 'tomorrow' | 'nextweek') {
    await api(`/activities/${a.id}`, { method: 'PATCH', body: { dueAt: snoozeDate(opt) } });
    setSnoozeOpen(false);
    onChanged();
  }

  const isOpenTask = !a.done;

  return (
    <div className={`timeline-item${a.done ? ' done' : ''}`}>
      <div className="t-subject">
        <span title={meta.label} style={{ marginRight: 6 }}>{meta.icon}</span>
        {a.subject}
      </div>
      <div className="t-meta">
        {a.notes && <span>{a.notes} · </span>}
        {a.dueAt ? `vence ${formatDate(a.dueAt)}` : ''}
        {a.done ? ' · concluída' : ''}
      </div>
      {isOpenTask && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {!completing && <button className="btn btn-sm" onClick={() => setCompleting(true)}>✓ Concluir</button>}
          <button className="btn btn-sm btn-ghost" onClick={() => setSnoozeOpen((v) => !v)}>⏰ Adiar</button>
          {snoozeOpen && (
            <>
              <button className="btn btn-sm" onClick={() => snooze('1h')}>+1h</button>
              <button className="btn btn-sm" onClick={() => snooze('tomorrow')}>Amanhã</button>
              <button className="btn btn-sm" onClick={() => snooze('nextweek')}>Próx. semana</button>
            </>
          )}
        </div>
      )}
      {completing && (
        <div style={{ marginTop: 6 }}>
          <input
            placeholder="Anotação ao concluir (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text)', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-primary" onClick={complete}>Registrar</button>
            <button className="btn btn-sm" onClick={() => setCompleting(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditForm({ deal, onSaved, onCancel }: { deal: Deal; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(deal.title);
  const [date, setDate] = useState(deal.expectedCloseDate?.slice(0, 10) ?? '');
  const [qualification, setQualification] = useState<DealQualification>(deal.qualification);
  const [sourceId, setSourceId] = useState(deal.source?.id ?? '');
  const [campaignId, setCampaignId] = useState(deal.campaign?.id ?? '');
  const [custom, setCustom] = useState<Record<string, unknown>>(deal.customFields ?? {});
  const [sources, setSources] = useState<Catalog[]>([]);
  const [campaigns, setCampaigns] = useState<Catalog[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Catalog[]>('/sources').then(setSources).catch(() => {});
    api<Catalog[]>('/campaigns').then(setCampaigns).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/deals/${deal.id}`, {
        method: 'PATCH',
        body: {
          title,
          expectedCloseDate: date || null,
          qualification,
          sourceId: sourceId || null,
          campaignId: campaignId || null,
          customFields: custom,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <div className="field"><label>Título</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="field"><label>Fechamento previsto</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
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
        <button type="button" className="btn btn-sm" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Salvar</button>
      </div>
    </form>
  );
}

function AddActivity({ dealId, onAdded }: { dealId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>('CALL');
  const [subject, setSubject] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/activities', { method: 'POST', body: { dealId, type, subject, dueAt: dueAt || undefined } });
      setSubject('');
      setDueAt('');
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>+ Registrar atividade</button>;

  return (
    <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 8 }}>
      <div className="field" style={{ marginBottom: 8 }}>
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{ACTIVITY_META[t].icon} {ACTIVITY_META[t].label}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <input placeholder="Assunto (ex.: Ligar para follow-up)" value={subject} onChange={(e) => setSubject(e.target.value)} required autoFocus />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 12 }}>Vencimento (opcional — vira tarefa)</label>
        <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Adicionar</button>
      </div>
    </form>
  );
}
