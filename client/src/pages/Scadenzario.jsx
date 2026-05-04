import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, formatDateShort, statusLabel, statusColor } from '../utils/format.js';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Etichetta pagamento
function payLabel(p) {
  return p.label || (p.type === 'ACCONTO' ? 'Acconto' : 'Saldo');
}

function MonthlyCalendar({ payments, year, month }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = [];
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) days.push({ day: prevMonthDays - i, otherMonth: true, payments: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayPayments = payments.filter(p => p.dueDate && p.dueDate.substring(0, 10) === dateStr);
    days.push({ day: d, otherMonth: false, payments: dayPayments });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) for (let i = 1; i <= remaining; i++) days.push({ day: i, otherMonth: true, payments: [] });
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  return (
    <div>
      <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>{monthNames[month]} {year}</div>
      <div className="cal-grid">
        {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => <div key={d} className="cal-header">{d}</div>)}
        {days.map((d, i) => (
          <div key={i} className={`cal-day${d.otherMonth ? ' other-month' : ''}`}>
            <div className="day-num">{d.day}</div>
            {d.payments.map(p => (
              <Link key={p.id} to={`/suppliers/${p.supplierId}`} className="cal-event" style={{ background: statusColor(p.status) + '22', color: statusColor(p.status), textDecoration: 'none' }}>
                {formatCurrency(p.amount)} - {p.supplier?.alias}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({ payments, groupBy }) {
  const groups = {};
  payments.forEach(p => {
    let key;
    if (!p.dueDate) { key = 'Senza scadenza'; }
    else if (groupBy === 'day') { key = formatDate(p.dueDate); }
    else if (groupBy === 'week') {
      const d = new Date(p.dueDate);
      key = `Settimana ${getWeekNumber(d)} - ${d.getFullYear()}`;
    } else {
      const d = new Date(p.dueDate);
      const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
      key = `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return (
    <div>
      {Object.entries(groups).map(([label, items]) => {
        const total = items.reduce((s, p) => s + p.amount, 0);
        return (
          <div key={label} className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <div className="card-title">{label}</div>
              <div style={{ fontWeight: 600 }}>{formatCurrency(total)}</div>
            </div>
            <table>
              <thead><tr><th>Fornitore</th><th>Tranche</th><th>Importo</th><th>Scadenza</th><th>Pagato il</th><th>Stato</th><th>Causale</th></tr></thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id}>
                    <td><Link to={`/suppliers/${p.supplierId}`}>{p.supplier?.alias || p.supplier?.businessName}</Link></td>
                    <td>{payLabel(p)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>{p.status === 'PAID' ? formatDate(p.paidDate) : '-'}</td>
                    <td><span className="badge" style={{ background: statusColor(p.status) + '22', color: statusColor(p.status) }}>{statusLabel(p.status)}</span></td>
                    <td style={{ fontSize: 12 }}>{p.causale || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function GridView({ payments }) {
  // Collect unique dates and suppliers
  const dateSet = new Set();
  const supplierMap = {};
  payments.forEach(p => {
    if (p.dueDate) dateSet.add(p.dueDate.substring(0, 10));
    if (p.paidDate) dateSet.add(p.paidDate.substring(0, 10));
    const key = p.supplierId;
    if (!supplierMap[key]) supplierMap[key] = { alias: p.supplier?.alias || p.supplier?.businessName || '?', id: key };
  });
  const dates = [...dateSet].sort();
  const suppliers = Object.values(supplierMap).sort((a, b) => a.alias.localeCompare(b.alias));

  if (dates.length === 0 || suppliers.length === 0) return <div className="empty">Nessun dato da visualizzare</div>;

  // Build lookup: supplierId+date -> payments
  const lookup = {};
  payments.forEach(p => {
    const dateKey = p.dueDate ? p.dueDate.substring(0, 10) : null;
    if (dateKey) {
      const k = `${p.supplierId}_${dateKey}`;
      if (!lookup[k]) lookup[k] = [];
      lookup[k].push(p);
    }
  });

  // Compute totals per date
  const dateTotals = {};
  dates.forEach(d => {
    dateTotals[d] = payments.filter(p => p.dueDate && p.dueDate.substring(0, 10) === d).reduce((s, p) => s + p.amount, 0);
  });

  // Compute totals per supplier
  const supplierTotals = {};
  suppliers.forEach(s => {
    supplierTotals[s.id] = payments.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + p.amount, 0);
  });

  return (
    <div className="card">
      <div className="table-wrap">
        <table style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 2, minWidth: 140 }}>Fornitore</th>
              {dates.map(d => <th key={d} style={{ textAlign: 'center', minWidth: 100, whiteSpace: 'nowrap' }}>{formatDateShort(d)}</th>)}
              <th style={{ textAlign: 'right', minWidth: 100 }}>Totale</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, fontWeight: 600 }}>
                  <Link to={`/suppliers/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{s.alias}</Link>
                </td>
                {dates.map(d => {
                  const items = lookup[`${s.id}_${d}`];
                  if (!items) return <td key={d} style={{ textAlign: 'center', color: 'var(--border)' }}>-</td>;
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: 4 }}>
                      {items.map(p => (
                        <div key={p.id} style={{
                          background: statusColor(p.status) + '18',
                          color: statusColor(p.status),
                          borderRadius: 4, padding: '2px 6px', marginBottom: 2,
                          fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap',
                          borderLeft: `3px solid ${statusColor(p.status)}`
                        }}>
                          {formatCurrency(p.amount)}
                          <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.8 }}>{payLabel(p)}</div>
                        </div>
                      ))}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(supplierTotals[s.id])}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--text)', fontWeight: 700 }}>
              <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>TOTALE</td>
              {dates.map(d => (
                <td key={d} style={{ textAlign: 'center' }}>{formatCurrency(dateTotals[d])}</td>
              ))}
              <td style={{ textAlign: 'right' }}>{formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Scadenzario() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('');
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    api.getPayments().then(setPayments).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const filtered = statusFilter ? payments.filter(p => p.status === statusFilter) : payments;
  const totalFiltered = filtered.reduce((s, p) => s + p.amount, 0);

  const views = [
    { key: 'grid', label: 'Griglia' },
    { key: 'day', label: 'Giorno' },
    { key: 'week', label: 'Settimana' },
    { key: 'month', label: 'Mese' },
    { key: 'calendar', label: 'Calendario' }
  ];

  return (
    <div>
      <h1 className="page-title">Scadenzario</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="view-tabs">
          {views.map(v => (
            <button key={v.key} className={`view-tab${view === v.key ? ' active' : ''}`} onClick={() => setView(v.key)}>
              {v.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Tutti gli stati</option>
            <option value="PENDING">Da pagare</option>
            <option value="SCHEDULED">Programmati</option>
            <option value="PAID">Pagati</option>
            <option value="OVERDUE">Scaduti</option>
          </select>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Totale: {formatCurrency(totalFiltered)}</span>
        </div>
      </div>

      {view === 'calendar' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <button className="btn btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}>← Prec</button>
            <button className="btn btn-sm" onClick={() => setCalDate(new Date())}>Oggi</button>
            <button className="btn btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}>Succ →</button>
          </div>
          <MonthlyCalendar payments={filtered} year={calDate.getFullYear()} month={calDate.getMonth()} />
        </div>
      ) : view === 'grid' ? (
        <GridView payments={filtered} />
      ) : (
        <ListView payments={filtered} groupBy={view} />
      )}
    </div>
  );
}
