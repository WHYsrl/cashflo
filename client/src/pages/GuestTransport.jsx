import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

export default function GuestTransport() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState('en');
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('report');
  const [flightCheck, setFlightCheck] = useState('');
  const [flightLoading, setFlightLoading] = useState(false);
  const [direction, setDirection] = useState('both'); // 'arrivals', 'departures', 'both'

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);
  useEffect(() => {
    if (token) api.getGuests(token).then(g => { setGuests(g); setSelected(g.map(x => x.id)); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const toggleAll = () => selected.length === guests.length ? setSelected([]) : setSelected(guests.map(g => g.id));
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateTransportEmail(selected, language, direction, token);
      setEmail(result.email);
      setView('email');
    } catch (e) { alert(e.message); }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const selectedGuests = useMemo(() => guests.filter(g => selected.includes(g.id)), [guests, selected]);
  const totalPeople = useMemo(() => selectedGuests.length, [selectedGuests]);
  const withMobility = useMemo(() => selectedGuests.filter(g => g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim())), [selectedGuests]);

  const showArrivals = direction === 'arrivals' || direction === 'both';
  const showDepartures = direction === 'departures' || direction === 'both';

  // ── ARRIVALS ──
  const arrivalsByDay = useMemo(() => {
    if (!showArrivals) return [];
    const map = {};
    selectedGuests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr) return;
      const day = arr.arrivalDay || arr.date || 'TBD';
      if (!map[day]) map[day] = [];
      map[day].push({ guest: g, flight: arr });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedGuests, showArrivals]);

  const arrivalTransferGroups = useMemo(() => {
    if (!showArrivals) return [];
    const timeMap = {};
    selectedGuests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr?.arrivalTime) return;
      const day = arr.arrivalDay || arr.date || 'TBD';
      const hour = arr.arrivalTime.split(':')[0] || arr.arrivalTime.substring(0, 2);
      const key = `${day}_${hour}`;
      if (!timeMap[key]) timeMap[key] = { day, hour: `${hour}:00`, guests: [] };
      timeMap[key].guests.push({ guest: g, flight: arr });
    });
    return Object.values(timeMap).filter(g => g.guests.length >= 2).sort((a, b) => a.day.localeCompare(b.day));
  }, [selectedGuests, showArrivals]);

  // ── DEPARTURES ──
  const departuresByDay = useMemo(() => {
    if (!showDepartures) return [];
    const map = {};
    selectedGuests.forEach(g => {
      const dep = g.flights?.find(f => f.direction === 'DEPARTURE');
      if (!dep) return;
      const day = dep.date || dep.arrivalDay || 'TBD';
      if (!map[day]) map[day] = [];
      map[day].push({ guest: g, flight: dep });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedGuests, showDepartures]);

  const departureTransferGroups = useMemo(() => {
    if (!showDepartures) return [];
    const timeMap = {};
    selectedGuests.forEach(g => {
      const dep = g.flights?.find(f => f.direction === 'DEPARTURE');
      if (!dep?.departureTime) return;
      const day = dep.date || dep.arrivalDay || 'TBD';
      const hour = dep.departureTime.split(':')[0] || dep.departureTime.substring(0, 2);
      const key = `${day}_${hour}`;
      if (!timeMap[key]) timeMap[key] = { day, hour: `${hour}:00`, guests: [] };
      timeMap[key].guests.push({ guest: g, flight: dep });
    });
    return Object.values(timeMap).filter(g => g.guests.length >= 2).sort((a, b) => a.day.localeCompare(b.day));
  }, [selectedGuests, showDepartures]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const dirBtnStyle = (val) => ({
    padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
    background: direction === val ? 'var(--primary)' : 'white',
    color: direction === val ? 'white' : 'var(--text)',
    transition: 'all 0.15s',
  });

  // Render a transport table (used for both arrivals and departures)
  const renderTransportTable = (entries, isArrival) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ospite</th><th>Volo</th>
            <th>{isArrival ? 'Arrivo' : 'Partenza'}</th>
            <th>Tratta</th>
            <th>Hotel</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.sort((a, b) => {
            const timeA = isArrival ? (a.flight?.arrivalTime || '') : (a.flight?.departureTime || '');
            const timeB = isArrival ? (b.flight?.arrivalTime || '') : (b.flight?.departureTime || '');
            return timeA.localeCompare(timeB);
          }).map(({ guest: g, flight: f }) => (
            <tr key={g.id} className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
              <td style={{ fontWeight: 600 }}>{g.firstName} {g.lastName}</td>
              <td style={{ fontSize: 12 }}>{f?.airline} {f?.flightNumber || '-'}</td>
              <td style={{ fontWeight: 600 }}>{isArrival ? (f?.arrivalTime || '-') : (f?.departureTime || '-')}</td>
              <td style={{ fontSize: 12 }}>{f?.departureAirport || '?'} → {f?.arrivalAirport || '?'}</td>
              <td style={{ fontSize: 12 }}>{g.roomType || '-'}</td>
              <td style={{ fontSize: 11 }}>
                {g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim()) && <span style={{ color: 'var(--danger)' }}>♿ {g.mobilityNeeds}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render transfer grouping card
  const renderTransferGroups = (groups, isArrival) => {
    if (groups.length === 0) return null;
    return (
      <div className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${isArrival ? 'var(--success)' : '#6366f1'}` }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
          {isArrival ? '🚐 Raggruppamento arrivi' : '🚐 Raggruppamento ripartenze'}
        </div>
        {groups.map((group, i) => (
          <div key={i} style={{ marginBottom: 8, padding: 8, background: isArrival ? '#f0fdf4' : '#eef2ff', borderRadius: 4 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>
              📅 {formatDate(group.day)} — fascia {group.hour} ({group.guests.length} persone)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 8, marginTop: 4 }}>
              {group.guests.map(({ guest: g, flight: f }) => {
                const time = isArrival ? f.arrivalTime : f.departureTime;
                return `${g.firstName} ${g.lastName} (${time})`;
              }).join(' • ')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🚐 Transportation</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Direction filter */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button style={dirBtnStyle('arrivals')} onClick={() => setDirection('arrivals')}>🛬 Arrivi</button>
            <button style={dirBtnStyle('both')} onClick={() => setDirection('both')}>🔄 Entrambi</button>
            <button style={dirBtnStyle('departures')} onClick={() => setDirection('departures')}>🛫 Ripartenze</button>
          </div>
          <div className="view-tabs">
            <button className={`view-tab${view === 'report' ? ' active' : ''}`} onClick={() => setView('report')}>📊 Report</button>
            <button className={`view-tab${view === 'email' ? ' active' : ''}`} onClick={() => setView('email')}>✉️ Email</button>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="it">Italiano</option>
          </select>
          <button className="btn" onClick={() => window.open(api.exportTransportUrl(token), '_blank')} style={{ whiteSpace: 'nowrap' }}>
            📥 Export Excel
          </button>
          <button className="btn" onClick={checkFlights} disabled={flightLoading} style={{ whiteSpace: 'nowrap' }}>
            {flightLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Controllo...</> : '✈️ Controllo Voli'}
          </button>
          <button className="btn btn-primary" onClick={generate} disabled={generating || selected.length === 0}>
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Generazione...</> : '🚐 Genera Email'}
          </button>
        </div>
      </div>

      {/* Guest selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.length === guests.length} onChange={toggleAll} />
            <strong>{selected.length}/{guests.length} ospiti selezionati</strong>
          </label>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{totalPeople} persone totali</span>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {guests.map(g => {
            const arrFlight = g.flights?.find(f => f.direction === 'ARRIVAL');
            const depFlight = g.flights?.find(f => f.direction === 'DEPARTURE');
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                <span style={{ fontWeight: 500, minWidth: 150 }}>{g.firstName} {g.lastName}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {showArrivals && arrFlight && <span>🛬 {arrFlight.airline || ''} {arrFlight.flightNumber || ''} {arrFlight.arrivalTime || ''}</span>}
                  {showArrivals && showDepartures && arrFlight && depFlight && ' | '}
                  {showDepartures && depFlight && <span>🛫 {depFlight.airline || ''} {depFlight.flightNumber || ''} {depFlight.departureTime || ''}</span>}
                  {!arrFlight && !depFlight && 'No flights'}
                  {showArrivals && !showDepartures && !arrFlight && 'No arrival'}
                  {showDepartures && !showArrivals && !depFlight && 'No departure'}
                </span>
                {g.mobilityNeeds && !['none','n/a','no'].includes((g.mobilityNeeds||'').toLowerCase().trim()) && <span style={{ fontSize: 11, color: 'var(--danger)' }}>♿</span>}
              </label>
            );
          })}
        </div>
      </div>

      {/* ── REPORT VIEW ── */}
      {view === 'report' && selectedGuests.length > 0 && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">Ospiti</div><div className="stat-value">{selectedGuests.length}</div></div>
            <div className="stat-card"><div className="stat-label">Persone</div><div className="stat-value">{totalPeople}</div></div>
            {showArrivals && <div className="stat-card"><div className="stat-label">Giorni arrivo</div><div className="stat-value">{arrivalsByDay.length}</div></div>}
            {showDepartures && <div className="stat-card"><div className="stat-label">Giorni ripartenza</div><div className="stat-value">{departuresByDay.length}</div></div>}
            <div className="stat-card"><div className="stat-label">Esigenze mobilità</div><div className="stat-value" style={{ color: withMobility.length > 0 ? 'var(--danger)' : undefined }}>{withMobility.length}</div></div>
          </div>

          {/* Mobility alerts */}
          {withMobility.length > 0 && (
            <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>♿ Esigenze mobilità</div>
              {withMobility.map(g => (
                <div key={g.id} style={{ fontSize: 13, padding: '3px 0', cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${g.id}`)}>
                  ★ {g.firstName} {g.lastName}: <span style={{ color: 'var(--danger)' }}>{g.mobilityNeeds}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── ARRIVALS SECTION ── */}
          {showArrivals && (
            <>
              {direction === 'both' && (
                <div style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🛬 Arrivi — Aeroporto → Hotel
                </div>
              )}

              {renderTransferGroups(arrivalTransferGroups, true)}

              {arrivalsByDay.map(([day, entries]) => (
                <div key={`arr-${day}`} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>📅 {day === 'TBD' ? 'Data da confermare' : formatDate(day)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entries.length} persone</span>
                  </div>
                  {renderTransportTable(entries, true)}
                </div>
              ))}

              {arrivalsByDay.length === 0 && (
                <div className="card" style={{ marginBottom: 12, textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                  Nessun volo di arrivo registrato per gli ospiti selezionati.
                </div>
              )}
            </>
          )}

          {/* ── DEPARTURES SECTION ── */}
          {showDepartures && (
            <>
              {direction === 'both' && (
                <div style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 12px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🛫 Ripartenze — Hotel → Aeroporto
                </div>
              )}

              {renderTransferGroups(departureTransferGroups, false)}

              {departuresByDay.map(([day, entries]) => (
                <div key={`dep-${day}`} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>📅 {day === 'TBD' ? 'Data da confermare' : formatDate(day)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entries.length} persone</span>
                  </div>
                  {renderTransportTable(entries, false)}
                </div>
              ))}

              {departuresByDay.length === 0 && (
                <div className="card" style={{ marginBottom: 12, textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                  Nessun volo di ripartenza registrato per gli ospiti selezionati.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Flight Check Results ── */}
      {(flightCheck || flightLoading) && view === 'report' && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-header"><div className="card-title">✈️ Controllo Voli</div></div>
          {flightLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', gap: 12 }}>
              <div className="spinner" style={{ width: 30, height: 30, borderWidth: 3 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Analisi voli in corso...</div>
            </div>
          ) : (
            <div style={{ lineHeight: 1.6, padding: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, maxHeight: 500, overflowY: 'auto' }}>
              {renderMarkdown(flightCheck)}
            </div>
          )}
        </div>
      )}

      {/* ── EMAIL VIEW ── */}
      {view === 'email' && email && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Email generata</div>
            <button className="btn btn-sm btn-primary" onClick={copyToClipboard}>{copied ? '✅ Copiato!' : '📋 Copia'}</button>
          </div>
          <pre className="whatsapp-output" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>{email}</pre>
        </div>
      )}
      {view === 'email' && !email && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Premi "Genera Email" per creare il testo da inviare alla società di trasporto.
        </div>
      )}
    </div>
  );
}
