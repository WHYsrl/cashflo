export function formatCurrency(n) {
  if (n == null || isNaN(n)) return '-';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function statusLabel(s) {
  const map = { PENDING: 'Da pagare', SCHEDULED: 'Programmato', PAID: 'Pagato', OVERDUE: 'Scaduto' };
  return map[s] || s;
}

export function statusColor(s) {
  const map = { PENDING: '#f59e0b', SCHEDULED: '#3b82f6', PAID: '#10b981', OVERDUE: '#ef4444' };
  return map[s] || '#6b7280';
}

export function typeLabel(t) {
  const map = { ACCONTO: 'Acconto', SALDO: 'Saldo' };
  return map[t] || t;
}

export function docTypeLabel(t) {
  const map = { PREVENTIVO: 'Preventivo', FATTURA: 'Fattura', CONTRATTO: 'Contratto', RICEVUTA: 'Ricevuta', ALTRO: 'Altro' };
  return map[t] || t;
}
