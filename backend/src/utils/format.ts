// Formata centavos em moeda (pt-BR). Usado na renderização de modelos.
export function formatMoneyCents(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}
