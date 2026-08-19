import type { ActivityType, DealQualification } from './types.js';

// Ícone + rótulo por tipo de atividade (paridade com o RD Station).
export const ACTIVITY_META: Record<ActivityType, { icon: string; label: string }> = {
  CALL: { icon: '📞', label: 'Ligação' },
  EMAIL: { icon: '✉️', label: 'E-mail' },
  MEETING: { icon: '🤝', label: 'Reunião' },
  NOTE: { icon: '📝', label: 'Anotação' },
  TASK: { icon: '✅', label: 'Tarefa' },
  LUNCH: { icon: '🍽️', label: 'Almoço' },
  VISIT: { icon: '📍', label: 'Visita' },
  WHATSAPP: { icon: '💬', label: 'WhatsApp' },
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_META) as ActivityType[];

export const QUALIFICATION_META: Record<DealQualification, { label: string; color: string }> = {
  NONE: { label: 'Sem qualificação', color: 'var(--text-muted)' },
  COLD: { label: 'Frio', color: '#3b82f6' },
  WARM: { label: 'Morno', color: '#d97706' },
  HOT: { label: 'Quente', color: '#dc2626' },
};

// Calcula uma nova data de vencimento para "adiar" uma tarefa.
export function snoozeDate(option: '1h' | 'tomorrow' | 'nextweek'): string {
  const d = new Date();
  if (option === '1h') d.setHours(d.getHours() + 1);
  if (option === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  }
  if (option === 'nextweek') {
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString();
}
