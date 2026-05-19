import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

function useGuestAuth() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  useEffect(() => { if (!token) navigate('/guests/login'); }, [token, navigate]);
  return token;
}

/* ── Expandable Section ── */
function Section({ icon, title, count, badge, badgeColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          {count != null && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({count})</span>}
          {badge && (
            <span className="badge" style={{ background: badgeColor || 'var(--primary)', color: '#fff', fontSize: 10 }}>{badge}</span>
          )}
        </div>
        <span style={{ fontSize: 18, color: 'var(--text-secondary)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
      </div>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}

/* ── Mini table helper ── */
function MiniTable({ columns, rows, onRowClick }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={onRowClick ? 'clickable-row' : ''} onClick={() => onRowClick?.(row)} style={onRowClick ? { cursor: 'pointer' } : {}}>
              {row.cells.map((cell, j) => <td key={j} style={cell.style || {}}>{cell.value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Alert Badge ── */
function AlertBadge({ type, children }) {
  const colors = {
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
    danger: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' },
    info: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' },
    success: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 6 }}>
      {children}
    </div>
  );
}

export default function GuestInsights() {
  const token = useGuestAuth();
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (token) api.getGuests(token).then(setGuests).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  /* ── Computed data ── */
  const stats = useMemo(() => {
    if (!guests.length) return null;
    const totalPeople = guests.reduce((s, g) => s + 1 + (g.companions?.length || 0), 0);
    const totalRooms = guests.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0);
    const withArrival = guests.filter(g => g.flights?.some(f => f.direction === 'ARRIVAL'));
    const withDeparture = guests.filter(g => g.flights?.some(f => f.direction === 'DEPARTURE'));
    const withDiet = guests.filter(g => g.dietaryRestrictions && g.dietaryRestrictions.toLowerCase() !== 'none');
    const withMobility = guests.filter(g => g.mobilityNeeds && g.mobilityNeeds.toLowerCase() !== 'none');
    const withMedical = guests.filter(g => g.medicalInfo && g.medicalInfo.toLowerCase() !== 'none');
    const withSpecialReq = guests.filter(g => g.specialRequests);
    const missingPassport = guests.filter(g => !g.passportNumber);
    const missingFlight = guests.filter(g => !g.flights?.some(f => f.direction === 'ARRIVAL'));
    const missingEmail = guests.filter(g => !g.email);
    const missingRoom = guests.filter(g => !g.roomType);
    return { totalPeople, totalRooms, withArrival, withDeparture, withDiet, withMobility, withMedical, withSpecialReq, missingPassport, missingFlight, missingEmail, missingRoom };
  }, [guests]);

  /* ── Arrivals grouped by day ── */
  const arrivalsByDay = useMemo(() => {
    const map = {};
    guests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr) return;
      const day = arr.arrivalDay || arr.date || 'Unknown';
      if (!map[day]) map[day] = [];
      map[day].push({ guest: g, flight: arr });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [guests]);

  /* ── Check-in grouped by day ── */
  const checkinByDay = useMemo(() => {
    const map = {};
    guests.forEach(g => {
      if (!g.checkInDate) return;
      const day = g.checkInDate;
      if (!map[day]) map[day] = [];
      map[day].push(g);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [guests]);

  /* ── Dietary restrictions ── */
  const dietaryList = useMemo(() => {
    return guests.filter(g => g.dietaryRestrictions && g.dietaryRestrictions.toLowerCase() !== 'none')
      .map(g => ({ id: g.id, name: `${g.firstName} ${g.lastName}`, diet: g.dietaryRestrictions }));
  }, [guests]);

  /* ── Alerts ── */
  const alerts = useMemo(() => {
    if (!guests.length) return [];
    const list = [];
    // Late/early arrivals
    guests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (arr?.arrivalTime) {
        const h = parseInt(arr.arrivalTime.split(':')[0]) || parseInt(arr.arrivalTime);
        if (h >= 22 || h <= 5) list.push({ type: 'warning', icon: '🌙', text: `${g.firstName} ${g.lastName} arriva alle ${arr.arrivalTime} — arrivo notturno, verificare trasporto e check-in tardivo`, guestId: g.id });
      }
    });
    // Mobility needs
    guests.forEach(g => {
      if (g.mobilityNeeds && g.mobilityNeeds.toLowerCase() !== 'none') {
        list.push({ type: 'danger', icon: '♿', text: `${g.firstName} ${g.lastName}: ${g.mobilityNeeds} — coordinare trasporto accessibile e camera adeguata`, guestId: g.id });
      }
    });
    // Medical
    guests.forEach(g => {
      if (g.medicalInfo && g.medicalInfo.toLowerCase() !== 'none') {
        list.push({ type: 'danger', icon: '🏥', text: `${g.firstName} ${g.lastName}: info mediche — ${g.medicalInfo.substring(0, 80)}`, guestId: g.id });
      }
    });
    // Missing critical data
    if (stats?.missingFlight.length > 0) {
      list.push({ type: 'info', icon: '✈️', text: `${stats.missingFlight.length} ospiti senza volo di arrivo registrato: ${stats.missingFlight.map(g => g.lastName).join(', ')}` });
    }
    if (stats?.missingRoom.length > 0) {
      list.push({ type: 'info', icon: '🏨', text: `${stats.missingRoom.length} ospiti senza tipo camera assegnata: ${stats.missingRoom.map(g => g.lastName).join(', ')}` });
    }
    if (stats?.missingPassport.length > 0 && stats.missingPassport.length <= 10) {
      list.push({ type: 'warning', icon: '🛂', text: `${stats.missingPassport.length} ospiti senza passaporto: ${stats.missingPassport.map(g => g.lastName).join(', ')}` });
    } else if (stats?.missingPassport.length > 10) {
      list.push({ type: 'warning', icon: '🛂', text: `${stats.missingPassport.length} ospiti senza dati passaporto` });
    }
    return list;
  }, [guests, stats]);

  /* ── Same-time arrivals (transfer grouping opportunities) ── */
  const transferGroups = useMemo(() => {
    const timeMap = {};
    guests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr?.arrivalTime || !arr?.arrivalDay && !arr?.date) return;
      const day = arr.arrivalDay || arr.date;
      const hour = arr.arrivalTime.split(':')[0] || arr.arrivalTime.substring(0, 2);
      const key = `${day}_${hour}`;
      if (!timeMap[key]) timeMap[key] = { day, hour: `${hour}:00`, guests: [] };
      timeMap[key].guests.push({ guest: g, flight: arr });
    });
    return Object.values(timeMap).filter(g => g.guests.length >= 2).sort((a, b) => a.day.localeCompare(b.day));
  }, [guests]);

  /* ── AI Insights ── */
  const generateAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await api.getGuestInsights(token);
      setAiInsights(result.insights);
    } catch (e) { setAiError(e.message); }
    setAiLoading(false);
  };

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h2 key={i} style={{ marginTop: 16, marginBottom: 8, fontSize: 18 }}>{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ marginTop: 12, marginBottom: 6, color: 'var(--primary)', fontSize: 16 }}>{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} style={{ marginTop: 8, marginBottom: 4, fontSize: 14 }}>{line.slice(4)}</h4>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 16, marginBottom: 2, fontSize: 13 }}>• {line.slice(2)}</div>;
      if (line.startsWith('───') || line.startsWith('═══')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />;
      if (line.trim() === '') return <br key={i} />;
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: 2, fontSize: 13 }} />;
    });
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!stats) return <div className="empty">Nessun dato ospiti disponibile.</div>;

  return (
    <div>
      <h1 className="page-title">Report & Insights</h1>

      {/* ── KPI Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Ospiti</div><div className="stat-value">{guests.length}</div></div>
        <div className="stat-card"><div className="stat-label">Persone totali</div><div className="stat-value">{stats.totalPeople}</div></div>
        <div className="stat-card"><div className="stat-label">Camere</div><div className="stat-value">{stats.totalRooms}</div></div>
        <div className="stat-card"><div className="stat-label">Con volo arrivo</div><div className="stat-value">{stats.withArrival.length}<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/{guests.length}</span></div></div>
        <div className="stat-card"><div className="stat-label">Restrizioni alimentari</div><div className="stat-value" style={{ color: stats.withDiet.length > 0 ? 'var(--warning)' : undefined }}>{stats.withDiet.length}</div></div>
        <div className="stat-card"><div className="stat-label">Esigenze mobilità</div><div className="stat-value" style={{ color: stats.withMobility.length > 0 ? 'var(--danger)' : undefined }}>{stats.withMobility.length}</div></div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <Section icon="🚨" title="Alert & Attenzioni" count={alerts.length} badge={`${alerts.filter(a => a.type === 'danger').length} critici`} badgeColor="var(--danger)" defaultOpen={true}>
          {alerts.map((a, i) => (
            <AlertBadge key={i} type={a.type}>
              <span style={{ marginRight: 6 }}>{a.icon}</span>
              {a.guestId ? (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/guests/${a.guestId}`)}>{a.text}</span>
              ) : a.text}
            </AlertBadge>
          ))}
        </Section>
      )}

      {/* ── Arrivals by Day ── */}
      <Section icon="✈️" title="Arrivi per giorno" count={stats.withArrival.length} defaultOpen={true}>
        {arrivalsByDay.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nessun volo di arrivo registrato.</div> : (
          arrivalsByDay.map(([day, entries]) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, padding: '4px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                📅 {formatDate(day)} — {entries.reduce((s, e) => s + 1 + (e.guest.companions?.length || 0), 0)} persone
              </div>
              <MiniTable
                columns={['Ospite', 'Pax', 'Volo', 'Orario arrivo', 'Da']}
                rows={entries.sort((a, b) => (a.flight.arrivalTime || '').localeCompare(b.flight.arrivalTime || '')).map(({ guest: g, flight: f }) => ({
                  cells: [
                    { value: <><span style={{ fontWeight: 500 }}>{g.firstName} {g.lastName}</span>{g.companions?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}> + {g.companions.map(c => c.fullName).join(', ')}</span>}</>, style: {} },
                    { value: 1 + (g.companions?.length || 0), style: { textAlign: 'center' } },
                    { value: `${f.airline || ''} ${f.flightNumber || ''}`.trim() || '-', style: { fontSize: 12 } },
                    { value: f.arrivalTime || '-', style: { fontWeight: 600 } },
                    { value: f.departureAirport || '-', style: { fontSize: 12 } }
                  ]
                }))}
                onRowClick={(row) => {}}
              />
            </div>
          ))
        )}
      </Section>

      {/* ── Transfer Grouping ── */}
      {transferGroups.length > 0 && (
        <Section icon="🚐" title="Raggruppamento trasferimenti" count={transferGroups.length + ' fasce orarie'}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Ospiti che arrivano nella stessa fascia oraria e possono condividere il trasferimento.</p>
          {transferGroups.map((group, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📅 {formatDate(group.day)} — fascia {group.hour}</div>
              <div style={{ fontSize: 13 }}>
                {group.guests.map(({ guest: g, flight: f }, j) => (
                  <div key={j} style={{ display: 'flex', gap: 12, padding: '2px 0' }}>
                    <span style={{ fontWeight: 500, minWidth: 150 }}>{g.firstName} {g.lastName}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.airline} {f.flightNumber} — {f.arrivalTime}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>({1 + (g.companions?.length || 0)} pax)</span>
                    {g.roomType && <span style={{ color: 'var(--text-secondary)' }}>→ {g.roomType}</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                Totale: {group.guests.reduce((s, { guest: g }) => s + 1 + (g.companions?.length || 0), 0)} persone
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── Hotel / Check-in ── */}
      <Section icon="🏨" title="Hotel — Check-in per giorno" count={checkinByDay.reduce((s, [, gs]) => s + gs.length, 0)}>
        {checkinByDay.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nessuna data di check-in registrata.</div> : (
          checkinByDay.map(([day, gs]) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, padding: '4px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                📅 Check-in {formatDate(day)} — {gs.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0)} camere, {gs.reduce((s, g) => s + 1 + (g.companions?.length || 0), 0)} persone
              </div>
              <MiniTable
                columns={['Ospite', 'Pax', 'Tipo camera', 'Camere', 'Check-out', 'Richieste']}
                rows={gs.map(g => ({
                  cells: [
                    { value: <span style={{ fontWeight: 500 }}>{g.firstName} {g.lastName}</span> },
                    { value: 1 + (g.companions?.length || 0), style: { textAlign: 'center' } },
                    { value: g.roomType || '-', style: { fontSize: 12 } },
                    { value: g.hotelRoomsNeeded || '-', style: { textAlign: 'center' } },
                    { value: g.checkOutDate ? formatDate(g.checkOutDate) : '-', style: { fontSize: 12 } },
                    { value: g.specialRequests ? <span style={{ fontSize: 11, color: 'var(--warning)' }}>{g.specialRequests.substring(0, 40)}{g.specialRequests.length > 40 ? '...' : ''}</span> : '-' }
                  ]
                }))}
              />
            </div>
          ))
        )}
      </Section>

      {/* ── Dietary ── */}
      <Section icon="🍽️" title="Restrizioni alimentari" count={dietaryList.length} badge={dietaryList.length > 0 ? 'attenzione' : null} badgeColor="var(--warning)">
        {dietaryList.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nessuna restrizione alimentare registrata.</div> : (
          <MiniTable
            columns={['Ospite', 'Restrizioni / Allergie']}
            rows={dietaryList.map(d => ({
              cells: [
                { value: <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${d.id}`)}>{d.name}</span> },
                { value: d.diet, style: { fontSize: 13 } }
              ]
            }))}
          />
        )}
      </Section>

      {/* ── Special Requests ── */}
      <Section icon="⚠️" title="Richieste speciali" count={stats.withSpecialReq.length}>
        {stats.withSpecialReq.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nessuna richiesta speciale.</div> : (
          <MiniTable
            columns={['Ospite', 'Richiesta']}
            rows={stats.withSpecialReq.map(g => ({
              cells: [
                { value: <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${g.id}`)}>{g.firstName} {g.lastName}</span> },
                { value: g.specialRequests, style: { fontSize: 13 } }
              ]
            }))}
          />
        )}
      </Section>

      {/* ── Data Completeness ── */}
      <Section icon="📊" title="Completezza dati" badge={`${Math.round(((guests.length - stats.missingEmail.length - stats.missingFlight.length - stats.missingRoom.length) / (guests.length * 3)) * 100)}%`} badgeColor="var(--primary)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { label: 'Email', have: guests.length - stats.missingEmail.length, total: guests.length, missing: stats.missingEmail },
            { label: 'Volo arrivo', have: stats.withArrival.length, total: guests.length, missing: stats.missingFlight },
            { label: 'Camera hotel', have: guests.length - stats.missingRoom.length, total: guests.length, missing: stats.missingRoom },
            { label: 'Passaporto', have: guests.length - stats.missingPassport.length, total: guests.length, missing: stats.missingPassport },
          ].map((item, i) => {
            const pct = Math.round((item.have / item.total) * 100);
            return (
              <div key={i} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: pct === 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)' }}>{item.have}/{item.total}</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)', borderRadius: 3, transition: 'width .3s' }} />
                </div>
                {item.missing.length > 0 && item.missing.length <= 6 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Mancanti: {item.missing.map(g => g.lastName).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── AI Insights ── */}
      <Section icon="🤖" title="AI Insights (analisi avanzata)" badge="Claude AI" badgeColor="#8b5cf6">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Genera un'analisi AI approfondita dei dati ospiti con suggerimenti operativi per coordinare fornitori, trasporti e logistica.
        </p>
        <button className="btn btn-primary" onClick={generateAI} disabled={aiLoading} style={{ marginBottom: 12 }}>
          {aiLoading ? '⏳ Analisi AI in corso...' : '🔍 Genera Insights AI'}
        </button>
        {aiError && <AlertBadge type="danger">{aiError}</AlertBadge>}
        {aiInsights && (
          <div style={{ lineHeight: 1.6, padding: 16, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>
            {renderMarkdown(aiInsights)}
          </div>
        )}
      </Section>
    </div>
  );
}
