import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, formatDateShort, statusLabel, statusColor, typeLabel } from '../utils/format.js';

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

function MonthlyCalendar({ payments, year, month }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const days = [];

  // Previous month padding
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, otherMonth: true, payments: [] });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayPayments = payments.filter(p => p.dueDate && p.dueDate.substring(0, 10) === dateStr);
    days.push({ day: d, otherMonth: false, payments: dayPayments });
  }
  // Next month padding
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
    if (!p.dueDate) {
      key = 'Senza scadenza';
    } else if (groupBy === 'day') {
      key = formatDate(p.dueDate);
    } else if (groupBy === 'week') {
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
              <thead><tr><th>Fornitore</th><th>Tipo</th><th>Importo</th><th>Scadenza</th><th>Stato</th><th>Causale</th></tr></thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id}>
                    <td><Link to={`/suppliers/${p.supplierId}`}>{p.supplier?.alias || p.supplier?.businessName}</Link></td>
                    <td>{typeLabel(p.type)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.dueDate)}</td>
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

export default function Scadenzario() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('day'); // day | week | month | calendar
  const [statusFilter, setStatusFilter] = useState('');
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    api.getPayments().then(setPayments).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const filtered = statusFilter ? payments.filter(p => p.status === statusFilter) : payments;
  const totalFiltered = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <h1 className="page-title">Scadenzario</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="view-tabs">
          {['day', 'week', 'month', 'calendar'].map(v => (
            <button key={v} className={`view-tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {v === 'day' ? 'Giorno' : v === 'week' ? 'Settimana' : v === 'month' ? 'Mese' : 'Calendario'}
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
      ) : (
        <ListView payments={filtered} groupBy={view} />
      )}
    </div>
  );
}
