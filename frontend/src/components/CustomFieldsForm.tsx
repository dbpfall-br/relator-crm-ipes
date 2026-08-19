import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { CustomFieldDef, CustomFieldEntity } from '../lib/types.js';

interface Props {
  entity: CustomFieldEntity;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

// Busca as definições de campos personalizados da entidade e renderiza os
// inputs adequados. Os valores ficam no objeto `customFields` do pai.
export default function CustomFieldsForm({ entity, values, onChange }: Props) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);

  useEffect(() => {
    api<CustomFieldDef[]>(`/custom-fields?entity=${entity}`).then(setDefs);
  }, [entity]);

  if (defs.length === 0) return null;

  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });

  return (
    <>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 8px' }}>
        CAMPOS PERSONALIZADOS
      </div>
      {defs.map((def) => {
        const v = values[def.key];
        return (
          <div className="field" key={def.id}>
            <label>
              {def.label}
              {def.required && <span style={{ color: 'var(--danger)' }}> *</span>}
            </label>
            {def.type === 'TEXT' && (
              <input
                value={(v as string) ?? ''}
                required={def.required}
                onChange={(e) => set(def.key, e.target.value)}
              />
            )}
            {def.type === 'NUMBER' && (
              <input
                type="number"
                value={(v as number) ?? ''}
                required={def.required}
                onChange={(e) => set(def.key, e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
            {def.type === 'DATE' && (
              <input
                type="date"
                value={((v as string) ?? '').slice(0, 10)}
                required={def.required}
                onChange={(e) => set(def.key, e.target.value || undefined)}
              />
            )}
            {def.type === 'SELECT' && (
              <select value={(v as string) ?? ''} required={def.required} onChange={(e) => set(def.key, e.target.value || undefined)}>
                <option value="">— selecione —</option>
                {def.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {def.type === 'MULTISELECT' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {def.options.map((o) => {
                  const arr = Array.isArray(v) ? (v as string[]) : [];
                  const checked = arr.includes(o);
                  return (
                    <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          set(def.key, checked ? arr.filter((x) => x !== o) : [...arr, o])
                        }
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
