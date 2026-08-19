import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import type { DealItem, Product } from '../lib/types.js';

// Lista/edição dos itens (produtos) da negociação. Alterar itens recalcula o
// valor do deal no backend — por isso avisamos o pai via onChanged.
export default function DealProducts({ dealId, onChanged }: { dealId: string; onChanged: () => void }) {
  const [items, setItems] = useState<DealItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [adding, setAdding] = useState(false);
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');

  const load = useCallback(async () => {
    setItems(await api<DealItem[]>(`/deals/${dealId}/items`));
  }, [dealId]);

  useEffect(() => {
    void load();
    api<Product[]>('/products').then((ps) => setProducts(ps.filter((p) => p.isActive)));
  }, [load]);

  const total = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { quantity: Number(quantity) || 1 };
    if (productId) body.productId = productId;
    if (description) body.description = description;
    if (price) body.unitPriceCents = Math.round(Number(price) * 100);
    await api(`/deals/${dealId}/items`, { method: 'POST', body });
    setAdding(false);
    setProductId(''); setDescription(''); setQuantity('1'); setPrice('');
    await load();
    onChanged();
  }

  async function remove(id: string) {
    await api(`/deals/${dealId}/items/${id}`, { method: 'DELETE' });
    await load();
    onChanged();
  }

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) { setDescription(p.name); setPrice((p.unitPriceCents / 100).toString()); }
  }

  return (
    <div className="drawer-section">
      <h3>Produtos</h3>
      {items.length === 0 && !adding && <p className="muted" style={{ fontSize: 13 }}>Nenhum produto adicionado.</p>}
      {items.map((i) => (
        <div key={i.id} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
          <div>
            {i.description}
            <span className="muted" style={{ fontSize: 12 }}> · {i.quantity} × {formatMoney(i.unitPriceCents)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{formatMoney(i.quantity * i.unitPriceCents)}</strong>
            <button className="btn btn-sm btn-danger" onClick={() => remove(i.id)}>✕</button>
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <div className="row-between" style={{ padding: '8px 0', fontWeight: 700 }}>
          <span>Total</span><span style={{ color: 'var(--success)' }}>{formatMoney(total)}</span>
        </div>
      )}

      {adding ? (
        <form onSubmit={add} className="card card-pad" style={{ marginTop: 8 }}>
          {products.length > 0 && (
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Produto do catálogo</label>
              <select value={productId} onChange={(e) => pickProduct(e.target.value)}>
                <option value="">— item avulso —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.unitPriceCents)})</option>)}
              </select>
            </div>
          )}
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Descrição</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="field" style={{ marginBottom: 8, width: 90 }}>
              <label>Qtd.</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 8, flex: 1 }}>
              <label>Preço unit. (R$)</label>
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-sm" onClick={() => setAdding(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>+ Adicionar produto</button>
      )}
    </div>
  );
}
