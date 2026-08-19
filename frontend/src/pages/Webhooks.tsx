import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Modal from '../components/Modal.js';
import { WEBHOOK_EVENTS, type Webhook } from '../lib/types.js';

export default function Webhooks() {
  const [items, setItems] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await api<Webhook[]>('/webhooks'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function toggle(w: Webhook) {
    await api(`/webhooks/${w.id}`, { method: 'PATCH', body: { isActive: !w.isActive } });
    void load();
  }
  async function test(w: Webhook) {
    await api(`/webhooks/${w.id}/test`, { method: 'POST' });
    alert('Evento de teste (webhook.test) disparado. Veja o log de entregas do seu endpoint.');
  }
  async function remove(w: Webhook) {
    if (!confirm(`Remover o webhook para ${w.url}?`)) return;
    await api(`/webhooks/${w.id}`, { method: 'DELETE' });
    void load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Webhooks</h1>
          <p>Integração de saída para automações e agentes de IA. Entregas assinadas com HMAC-SHA256.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Novo webhook
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="card-pad muted">
            Nenhum webhook configurado. Crie um para receber eventos como{' '}
            <span className="code-inline">deal.created</span>.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Eventos</th>
                <th>Entregas</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.url}</div>
                    {w.description && <div className="muted" style={{ fontSize: 12 }}>{w.description}</div>}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {w.events.length === 0 ? 'Todos' : w.events.join(', ')}
                  </td>
                  <td>{w._count?.deliveries ?? 0}</td>
                  <td>
                    <span className={`status-pill ${w.isActive ? 'WON' : 'LOST'}`}>
                      {w.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => test(w)}>
                      Testar
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggle(w)}>
                      {w.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(w)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewWebhookModal
          onClose={() => setShowNew(false)}
          onCreated={(secret) => {
            setShowNew(false);
            setCreatedSecret(secret);
            void load();
          }}
        />
      )}

      {createdSecret && (
        <Modal title="Webhook criado" onClose={() => setCreatedSecret(null)}>
          <p style={{ fontSize: 14 }}>
            Guarde o <strong>segredo</strong> abaixo — ele é usado para validar a assinatura{' '}
            <span className="code-inline">X-Relator-Signature</span> e não será exibido novamente.
          </p>
          <div className="code-inline" style={{ display: 'block', padding: 12 }}>
            {createdSecret}
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => setCreatedSecret(null)}>
              Entendi
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function NewWebhookModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (secret: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api<Webhook>('/webhooks', {
        method: 'POST',
        body: { url, description: description || undefined, events },
      });
      onCreated(created.secret ?? '(gerado)');
    } catch {
      setError('Não foi possível criar. Verifique se a URL é válida (http/https).');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo webhook" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>URL de destino *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seu-endpoint.com/webhook"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Eventos (nenhum marcado = todos)</label>
          <div className="check-group">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev}>
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} />
                <span className="code-inline">{ev}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
