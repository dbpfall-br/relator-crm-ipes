import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { ACTIVITY_META, ACTIVITY_TYPES, QUALIFICATION_META } from '../lib/activityMeta.js';
import type { AutomationAction, AutomationRule, AutomationTrigger, DealQualification, Stage } from '../lib/types.js';

const TRIGGERS: Record<AutomationTrigger, string> = {
  DEAL_CREATED: 'Quando a negociação é criada',
  DEAL_MOVED: 'Quando é movida para a etapa',
  DEAL_WON: 'Quando é marcada como ganha',
  DEAL_LOST: 'Quando é marcada como perdida',
  DEAL_CONVERTED: 'Quando um lead é convertido',
};
const ACTIONS: Record<AutomationAction, string> = {
  CREATE_TASK: 'Criar uma tarefa',
  CREATE_NOTE: 'Criar uma anotação',
  MOVE_STAGE: 'Mover para uma etapa',
  SET_QUALIFICATION: 'Definir a qualificação',
};

export default function Automations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => { setRules(await api<AutomationRule[]>('/automation-rules')); }, []);
  useEffect(() => {
    load();
    api<Stage[]>('/stages').then(setStages).catch(() => {});
  }, [load]);

  async function toggle(r: AutomationRule) {
    await api(`/automation-rules/${r.id}`, { method: 'PATCH', body: { isActive: !r.isActive } });
    void load();
  }
  async function remove(r: AutomationRule) {
    if (!confirm(`Excluir a automação "${r.name}"?`)) return;
    await api(`/automation-rules/${r.id}`, { method: 'DELETE' });
    void load();
  }

  const stageName = (id: unknown) => stages.find((s) => s.id === id)?.name ?? '—';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Automações</h1>
          <p>Regras "quando isto acontece → faça aquilo", executadas automaticamente.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Nova automação</button>
      </div>

      <div className="card">
        {rules.length === 0 ? (
          <div className="card-pad muted">Nenhuma automação. Crie uma para ganhar tempo.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Nome</th><th>Quando</th><th>Faça</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td className="muted" style={{ fontSize: 13 }}>
                    {TRIGGERS[r.trigger]}{r.trigger === 'DEAL_MOVED' && r.triggerConfig?.stageId ? ` "${stageName(r.triggerConfig.stageId)}"` : ''}
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{ACTIONS[r.action]}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggle(r)}>
                      <span className={`status-pill ${r.isActive ? 'WON' : 'LOST'}`}>{r.isActive ? 'Ativa' : 'Inativa'}</span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-danger" onClick={() => remove(r)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && <NewRuleModal stages={stages} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); void load(); }} />}
    </>
  );
}

function NewRuleModal({ stages, onClose, onCreated }: { stages: Stage[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>('DEAL_CREATED');
  const [triggerStage, setTriggerStage] = useState('');
  const [action, setAction] = useState<AutomationAction>('CREATE_TASK');
  const [cfg, setCfg] = useState<Record<string, string>>({ subject: '', type: 'TASK', dueInDays: '1', notes: '', stageId: '', qualification: 'WARM' });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const actionConfig: Record<string, unknown> = {};
    if (action === 'CREATE_TASK') Object.assign(actionConfig, { subject: cfg.subject, type: cfg.type, dueInDays: Number(cfg.dueInDays) || 1 });
    if (action === 'CREATE_NOTE') Object.assign(actionConfig, { subject: cfg.subject, notes: cfg.notes });
    if (action === 'MOVE_STAGE') Object.assign(actionConfig, { stageId: cfg.stageId });
    if (action === 'SET_QUALIFICATION') Object.assign(actionConfig, { qualification: cfg.qualification });
    try {
      await api('/automation-rules', {
        method: 'POST',
        body: {
          name, trigger, action, actionConfig,
          triggerConfig: trigger === 'DEAL_MOVED' && triggerStage ? { stageId: triggerStage } : {},
        },
      });
      onCreated();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Falha ao criar'); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Nova automação</h2>
        <form onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Ex.: Follow-up automático" /></div>

          <div className="field">
            <label>Quando (gatilho)</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {trigger === 'DEAL_MOVED' && (
            <div className="field">
              <label>Etapa de destino</label>
              <select value={triggerStage} onChange={(e) => setTriggerStage(e.target.value)}>
                <option value="">Qualquer etapa</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <label>Faça (ação)</label>
            <select value={action} onChange={(e) => setAction(e.target.value as AutomationAction)}>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {(action === 'CREATE_TASK' || action === 'CREATE_NOTE') && (
            <div className="field"><label>Assunto</label><input value={cfg.subject} onChange={(e) => set('subject', e.target.value)} required /></div>
          )}
          {action === 'CREATE_TASK' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Tipo</label>
                <select value={cfg.type} onChange={(e) => set('type', e.target.value)}>
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_META[t].icon} {ACTIVITY_META[t].label}</option>)}
                </select>
              </div>
              <div className="field" style={{ width: 120 }}><label>Vence em (dias)</label><input type="number" min="0" value={cfg.dueInDays} onChange={(e) => set('dueInDays', e.target.value)} /></div>
            </div>
          )}
          {action === 'CREATE_NOTE' && (
            <div className="field"><label>Texto da anotação</label><input value={cfg.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          )}
          {action === 'MOVE_STAGE' && (
            <div className="field"><label>Etapa</label>
              <select value={cfg.stageId} onChange={(e) => set('stageId', e.target.value)} required>
                <option value="">— selecione —</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {action === 'SET_QUALIFICATION' && (
            <div className="field"><label>Qualificação</label>
              <select value={cfg.qualification} onChange={(e) => set('qualification', e.target.value)}>
                {(Object.keys(QUALIFICATION_META) as DealQualification[]).map((q) => <option key={q} value={q}>{QUALIFICATION_META[q].label}</option>)}
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Criar automação</button>
          </div>
        </form>
      </div>
    </div>
  );
}
