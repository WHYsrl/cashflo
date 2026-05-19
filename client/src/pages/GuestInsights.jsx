import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

function useGuestAuth() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  useEffect(() => { if (!token) navigate('/guests/login'); }, [token, navigate]);
  return token;
}

/* ── i18n labels ── */
const L = {
  en: {
    title: 'Report & Insights',
    guests: 'Guests', totalPeople: 'Total people', rooms: 'Rooms',
    withArrival: 'With arrival flight', dietaryRestrictions: 'Dietary restrictions', mobilityNeeds: 'Mobility needs',
    alerts: 'Alerts & Warnings', critical: 'critical',
    arrivalsByDay: 'Arrivals by day', people: 'people',
    transferGrouping: 'Transfer grouping', timeSlots: 'time slots',
    transferDesc: 'Guests arriving in the same time slot who can share a transfer.',
    slot: 'slot', total: 'Total',
    hotelCheckin: 'Hotel — Check-in by day', noCheckin: 'No check-in date registered.',
    roomType: 'Room type', nRooms: 'Rooms', checkout: 'Check-out', requests: 'Requests',
    dietTitle: 'Dietary restrictions', attention: 'attention', noDiet: 'No dietary restrictions registered.',
    dietCol: 'Restrictions / Allergies',
    specialRequests: 'Special requests', noSpecial: 'No special requests.',
    requestCol: 'Request',
    dataCompleteness: 'Data completeness',
    email: 'Email', arrivalFlight: 'Arrival flight', hotelRoom: 'Hotel room', passport: 'Passport', missing: 'Missing',
    aiTitle: 'AI Insights (deep analysis)', aiDesc: 'Generate an AI-powered analysis of guest data with operational suggestions for coordinating suppliers, transport and logistics.',
    aiBtn: '🔍 Generate AI Insights', aiBtnLoading: '⏳ AI Analysis in progress...',
    guest: 'Guest', pax: 'Pax', flight: 'Flight', arrivalTime: 'Arrival time', from: 'From',
    translateBtn: '🌐 Traduci in italiano', translating: '⏳ Traduzione AI...', translated: '✅ Tradotto',
    lateArrival: 'arrives at {time} — night arrival, check transport and late check-in',
    mobility: '{name}: {needs} — coordinate accessible transport and suitable room',
    medical: '{name}: medical info — {info}',
    noFlight: '{count} guests without arrival flight: {names}',
    noRoom: '{count} guests without room type: {names}',
    noPassport: '{count} guests without passport: {names}',
    noPassportMany: '{count} guests without passport data',
    companions: 'Companions',
  },
  it: {
    title: 'Report & Insights',
    guests: 'Ospiti', totalPeople: 'Persone totali', rooms: 'Camere',
    withArrival: 'Con volo arrivo', dietaryRestrictions: 'Restrizioni alimentari', mobilityNeeds: 'Esigenze mobilità',
    alerts: 'Alert & Attenzioni', critical: 'critici',
    arrivalsByDay: 'Arrivi per giorno', people: 'persone',
    transferGrouping: 'Raggruppamento trasferimenti', timeSlots: 'fasce orarie',
    transferDesc: 'Ospiti che arrivano nella stessa fascia oraria e possono condividere il trasferimento.',
    slot: 'fascia', total: 'Totale',
    hotelCheckin: 'Hotel — Check-in per giorno', noCheckin: 'Nessuna data di check-in registrata.',
    roomType: 'Tipo camera', nRooms: 'Camere', checkout: 'Check-out', requests: 'Richieste',
    dietTitle: 'Restrizioni alimentari', attention: 'attenzione', noDiet: 'Nessuna restrizione alimentare registrata.',
    dietCol: 'Restrizioni / Allergie',
    specialRequests: 'Richieste speciali', noSpecial: 'Nessuna richiesta speciale.',
    requestCol: 'Richiesta',
    dataCompleteness: 'Completezza dati',
    email: 'Email', arrivalFlight: 'Volo arrivo', hotelRoom: 'Camera hotel', passport: 'Passaporto', missing: 'Mancanti',
    aiTitle: 'AI Insights (analisi avanzata)', aiDesc: 'Genera un\'analisi AI approfondita dei dati ospiti con suggerimenti operativi per coordinare fornitori, trasporti e logistica.',
    aiBtn: '🔍 Genera Insights AI', aiBtnLoading: '⏳ Analisi AI in corso...',
    guest: 'Ospite', pax: 'Pax', flight: 'Volo', arrivalTime: 'Orario arrivo', from: 'Da',
    translateBtn: '🌐 Translate to English', translating: '⏳ AI Translation...', translated: '✅ Translated',
    lateArrival: 'arriva alle {time} — arrivo notturno, verificare trasporto e check-in tardivo',
    mobility: '{name}: {needs} — coordinare trasporto accessibile e camera adeguata',
    medical: '{name}: info mediche — {info}',
    noFlight: '{count} ospiti senza volo di arrivo registrato: {names}',
    noRoom: '{count} ospiti senza tipo camera assegnata: {names}',
    noPassport: '{count} ospiti senza passaporto: {names}',
    noPassportMany: '{count} ospiti senza dati passaporto',
    companions: 'Accompagnatori',
  }
};

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
  const [rawGuests, setRawGuests] = useState([]);
  const [translatedGuests, setTranslatedGuests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('it');
  const [translating, setTranslating] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [flightCheck, setFlightCheck] = useState('');
  const [flightLoading, setFlightLoading] = useState(false);

  const t = L[language];

  useEffect(() => {
    if (token) api.getGuests(token).then(setRawGuests).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  // Use translated guests when Italian is selected and translation is available
  const guests = (language === 'it' && translatedGuests) ? translatedGuests : rawGuests;

  // Auto-translate when switching to Italian
  const handleLanguageChange = useCallback(async (lang) => {
    setLanguage(lang);
    if (lang === 'it' && !translatedGuests && rawGuests.length > 0) {
      setTranslating(true);
      try {
        const result = await api.translateGuestFields(token);
        setTranslatedGuests(result);
      } catch (e) {
        console.error('Translation failed:', e);
        // fallback: use raw guests
      }
      setTranslating(false);
    }
  }, [translatedGuests, rawGuests, token]);

  /* ── Computed data ── */
  const stats = useMemo(() => {
    if (!guests.length) return null;
    const totalPeople = guests.length;
    const totalRooms = guests.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0);
    const withArrival = guests.filter(g => g.flights?.some(f => f.direction === 'ARRIVAL'));
    const withDeparture = guests.filter(g => g.flights?.some(f => f.direction === 'DEPARTURE'));
    const withDiet = guests.filter(g => g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim()));
    const withMobility = guests.filter(g => g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim()));
    const withMedical = guests.filter(g => g.medicalInfo && !['none','n/a','no'].includes(g.medicalInfo.toLowerCase().trim()));
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
    return guests.filter(g => g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim()))
      .map(g => ({ id: g.id, name: `${g.firstName} ${g.lastName}`, diet: g.dietaryRestrictions }));
  }, [guests]);

  /* ── Alerts ── */
  const alerts = useMemo(() => {
    if (!guests.length) return [];
    const list = [];
    guests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (arr?.arrivalTime) {
        const h = parseInt(arr.arrivalTime.split(':')[0]) || parseInt(arr.arrivalTime);
        if (h >= 22 || h <= 5) list.push({ type: 'warning', icon: '🌙', text: t.lateArrival.replace('{time}', arr.arrivalTime).replace('{name}', `${g.firstName} ${g.lastName}`), name: `${g.firstName} ${g.lastName}`, guestId: g.id });
      }
    });
    guests.forEach(g => {
      if (g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim())) {
        list.push({ type: 'danger', icon: '♿', text: t.mobility.replace('{name}', `${g.firstName} ${g.lastName}`).replace('{needs}', g.mobilityNeeds), guestId: g.id });
      }
    });
    guests.forEach(g => {
      if (g.medicalInfo && !['none','n/a','no'].includes(g.medicalInfo.toLowerCase().trim())) {
        list.push({ type: 'danger', icon: '🏥', text: t.medical.replace('{name}', `${g.firstName} ${g.lastName}`).replace('{info}', g.medicalInfo.substring(0, 80)), guestId: g.id });
      }
    });
    if (stats?.missingFlight.length > 0) {
      list.push({ type: 'info', icon: '✈️', text: t.noFlight.replace('{count}', stats.missingFlight.length).replace('{names}', stats.missingFlight.map(g => g.lastName).join(', ')) });
    }
    if (stats?.missingRoom.length > 0) {
      list.push({ type: 'info', icon: '🏨', text: t.noRoom.replace('{count}', stats.missingRoom.length).replace('{names}', stats.missingRoom.map(g => g.lastName).join(', ')) });
    }
    if (stats?.missingPassport.length > 0 && stats.missingPassport.length <= 10) {
      list.push({ type: 'warning', icon: '🛂', text: t.noPassport.replace('{count}', stats.missingPassport.length).replace('{names}', stats.missingPassport.map(g => g.lastName).join(', ')) });
    } else if (stats?.missingPassport.length > 10) {
      list.push({ type: 'warning', icon: '🛂', text: t.noPassportMany.replace('{count}', stats.missingPassport.length) });
    }
    return list;
  }, [guests, stats, t]);

  /* ── Same-time arrivals ── */
  const transferGroups = useMemo(() => {
    const timeMap = {};
    guests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr?.arrivalTime || (!arr?.arrivalDay && !arr?.date)) return;
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
      const result = await api.getGuestInsights(language, token);
      setAiInsights(result.insights);
    } catch (e) { setAiError(e.message); }
    setAiLoading(false);
  };

  /* ── Flight Check ── */
  const checkFlights = async () => {
    setFlightLoading(true);
    try {
      const result = await api.checkFlights(language, token);
      setFlightCheck(result.flightCheck);
    } catch (e) { alert(e.message); }
    setFlightLoading(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t.title}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {translating && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⏳ Traduzione AI...</span>}
          <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => handleLanguageChange(e.target.value)}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
          <button className="btn" onClick={checkFlights} disabled={flightLoading} style={{ whiteSpace: 'nowrap' }}>
            {flightLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6, verticalAlign: 'middle', display: 'inline-block' }} /> {language === 'it' ? 'Controllo...' : 'Checking...'}</> : '✈️ Controllo Voli'}
          </button>
          <button className="btn btn-primary" onClick={generateAI} disabled={aiLoading} style={{ whiteSpace: 'nowrap' }}>
            {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6, verticalAlign: 'middle', display: 'inline-block' }} /> {t.aiBtnLoading}</> : t.aiBtn}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">{t.guests}</div><div className="stat-value">{guests.length}</div></div>
        <div className="stat-card"><div className="stat-label">{t.totalPeople}</div><div className="stat-value">{stats.totalPeople}</div></div>
        <div className="stat-card"><div className="stat-label">{t.rooms}</div><div className="stat-value">{stats.totalRooms}</div></div>
        <div className="stat-card"><div className="stat-label">{t.withArrival}</div><div className="stat-value">{stats.withArrival.length}<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/{guests.length}</span></div></div>
        <div className="stat-card"><div className="stat-label">{t.dietaryRestrictions}</div><div className="stat-value" style={{ color: stats.withDiet.length > 0 ? 'var(--warning)' : undefined }}>{stats.withDiet.length}</div></div>
        <div className="stat-card"><div className="stat-label">{t.mobilityNeeds}</div><div className="stat-value" style={{ color: stats.withMobility.length > 0 ? 'var(--danger)' : undefined }}>{stats.withMobility.length}</div></div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <Section icon="🚨" title={t.alerts} count={alerts.length} badge={`${alerts.filter(a => a.type === 'danger').length} ${t.critical}`} badgeColor="var(--danger)" defaultOpen={true}>
          {alerts.map((a, i) => (
            <AlertBadge key={i} type={a.type}>
              <span style={{ marginRight: 6 }}>{a.icon}</span>
              {a.guestId ? (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/guests/${a.guestId}`)}>{a.name ? `${a.name}: ` : ''}{a.text}</span>
              ) : a.text}
            </AlertBadge>
          ))}
        </Section>
      )}

      {/* ── Arrivals by Day ── */}
      <Section icon="✈️" title={t.arrivalsByDay} count={stats.withArrival.length} defaultOpen={true}>
        {arrivalsByDay.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</div> : (
          arrivalsByDay.map(([day, entries]) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, padding: '4px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                📅 {formatDate(day)} — {entries.length} {t.people}
              </div>
              <MiniTable
                columns={[t.guest, t.flight, t.arrivalTime, t.from]}
                rows={entries.sort((a, b) => (a.flight.arrivalTime || '').localeCompare(b.flight.arrivalTime || '')).map(({ guest: g, flight: f }) => ({
                  cells: [
                    { value: <span style={{ fontWeight: 500 }}>★ {g.firstName} {g.lastName}</span>, style: {} },
                    { value: `${f.airline || ''} ${f.flightNumber || ''}`.trim() || '-', style: { fontSize: 12 } },
                    { value: f.arrivalTime || '-', style: { fontWeight: 600 } },
                    { value: f.departureAirport || '-', style: { fontSize: 12 } }
                  ]
                }))}
              />
            </div>
          ))
        )}
      </Section>

      {/* ── Transfer Grouping ── */}
      {transferGroups.length > 0 && (
        <Section icon="🚐" title={t.transferGrouping} count={transferGroups.length + ' ' + t.timeSlots}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t.transferDesc}</p>
          {transferGroups.map((group, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📅 {formatDate(group.day)} — {t.slot} {group.hour}</div>
              <div style={{ fontSize: 13 }}>
                {group.guests.map(({ guest: g, flight: f }, j) => (
                  <div key={j} style={{ padding: '2px 0' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontWeight: 500, minWidth: 150 }}>★ {g.firstName} {g.lastName}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.airline} {f.flightNumber} — {f.arrivalTime}</span>
                      {g.roomType && <span style={{ color: 'var(--text-secondary)' }}>→ {g.roomType}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                {t.total}: {group.guests.length} {t.people}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── Hotel / Check-in ── */}
      <Section icon="🏨" title={t.hotelCheckin} count={checkinByDay.reduce((s, [, gs]) => s + gs.length, 0)}>
        {checkinByDay.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.noCheckin}</div> : (
          checkinByDay.map(([day, gs]) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, padding: '4px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                📅 Check-in {formatDate(day)} — {gs.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0)} {t.rooms.toLowerCase()}, {gs.length} {t.people}
              </div>
              <MiniTable
                columns={[t.guest, t.roomType, t.nRooms, t.checkout, t.requests]}
                rows={gs.map(g => ({
                  cells: [
                    { value: <span style={{ fontWeight: 500 }}>★ {g.firstName} {g.lastName}</span> },
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
      <Section icon="🍽️" title={t.dietTitle} count={dietaryList.length} badge={dietaryList.length > 0 ? t.attention : null} badgeColor="var(--warning)">
        {dietaryList.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.noDiet}</div> : (
          <MiniTable
            columns={[t.guest, t.dietCol]}
            rows={dietaryList.map(d => ({
              cells: [
                { value: <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${d.id}`)}>★ {d.name}</span> },
                { value: d.diet, style: { fontSize: 13 } }
              ]
            }))}
          />
        )}
      </Section>

      {/* ── Special Requests ── */}
      <Section icon="⚠️" title={t.specialRequests} count={stats.withSpecialReq.length}>
        {stats.withSpecialReq.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.noSpecial}</div> : (
          <MiniTable
            columns={[t.guest, t.requestCol]}
            rows={stats.withSpecialReq.map(g => ({
              cells: [
                { value: <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${g.id}`)}>★ {g.firstName} {g.lastName}</span> },
                { value: g.specialRequests, style: { fontSize: 13 } }
              ]
            }))}
          />
        )}
      </Section>

      {/* ── Data Completeness ── */}
      <Section icon="📊" title={t.dataCompleteness} badge={`${Math.round(((guests.length - stats.missingEmail.length - stats.missingFlight.length - stats.missingRoom.length) / (guests.length * 3)) * 100)}%`} badgeColor="var(--primary)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { label: t.email, have: guests.length - stats.missingEmail.length, total: guests.length, missing: stats.missingEmail },
            { label: t.arrivalFlight, have: stats.withArrival.length, total: guests.length, missing: stats.missingFlight },
            { label: t.hotelRoom, have: guests.length - stats.missingRoom.length, total: guests.length, missing: stats.missingRoom },
            { label: t.passport, have: guests.length - stats.missingPassport.length, total: guests.length, missing: stats.missingPassport },
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
                    {t.missing}: {item.missing.map(g => g.lastName).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Flight Check ── */}
      {(flightCheck || flightLoading) && (
        <Section icon="✈️" title={language === 'it' ? 'Controllo Voli' : 'Flight Check'} badge="AI" badgeColor="#0ea5e9" defaultOpen={true}>
          {flightLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16 }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
                {language === 'it' ? 'Analisi voli in corso...' : 'Analyzing flights...'}<br/>
                <span style={{ fontSize: 12 }}>{language === 'it' ? 'Verifica tratte, orari e potenziali criticità...' : 'Checking routes, times and potential issues...'}</span>
              </div>
            </div>
          )}
          {!flightLoading && flightCheck && (
            <div style={{ lineHeight: 1.6, padding: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>
              {renderMarkdown(flightCheck)}
            </div>
          )}
        </Section>
      )}

      {/* ── AI Insights ── */}
      <Section icon="🤖" title={t.aiTitle} badge="Claude AI" badgeColor="#8b5cf6" defaultOpen={!!(aiInsights || aiLoading)}>
        {aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16 }}>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              {t.aiBtnLoading}<br/>
              <span style={{ fontSize: 12 }}>{language === 'it' ? 'L\'analisi può richiedere 15-30 secondi...' : 'Analysis may take 15-30 seconds...'}</span>
            </div>
          </div>
        )}
        {!aiLoading && !aiInsights && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t.aiDesc}
          </p>
        )}
        {aiError && <AlertBadge type="danger">{aiError}</AlertBadge>}
        {!aiLoading && aiInsights && (
          <div style={{ lineHeight: 1.6, padding: 16, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>
            {renderMarkdown(aiInsights)}
          </div>
        )}
      </Section>
    </div>
  );
}
