import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

export default function GuestMeetGreet() {
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

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);
  useEffect(() => {
    if (token) api.getGuests(token).then(g => { setGuests(g); setSelected(g.map(x => x.id)); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const toggleAll = () => selected.length === guests.length ? setSelected([]) : setSelected(guests.map(g => g.id));
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateMeetGreetEmail(selected, language, token);
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

  // ── Report data ──
  const selectedGuests = useMemo(() => guests.filter(g => selected.includes(g.id)), [guests, selected]);
  const totalPeople = useMemo(() => selectedGuests.length, [selectedGuests]);

  const arrivalsByDay = useMemo(() => {
    const map = {};
    selectedGuests.forEach(g => {
      const arr = g.flights?.find(f => f.direction === 'ARRIVAL');
      if (!arr) return;
      const day = arr.arrivalDay || arr.date || 'TBD';
      if (!map[day]) map[day] = [];
      map[day].push({ guest: g, flight: arr });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedGuests]);

  // Robust companion→main guest matching using normalized names
  const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

  const guestsWithFlight = useMemo(() => selectedGuests.filter(g => g.flights?.some(f => f.direction === 'ARRIVAL')), [selectedGuests]);
  const guestsWithoutFlight = useMemo(() => selectedGuests.filter(g => !g.flights?.some(f => f.direction === 'ARRIVAL')), [selectedGuests]);

  // Split: truly missing vs. traveling with main guest
  const { noFlight, travelingWith } = useMemo(() => {
    const no = [], tw = [];
    for (const g of guestsWithoutFlight) {
      const gLastNorm = normalize(g.lastName);
      const gFullNorm = normalize(g.firstName + ' ' + g.lastName);
      let found = null;
      for (const m of guestsWithFlight) {
        if (m.id === g.id || !m.companions?.length) continue;
        // Strategy 1: same last name
        if (normalize(m.lastName) === gLastNorm) { found = m; break; }
        // Strategy 2: companion fullName contains guest's full name
        for (const c of m.companions) {
          if (normalize(c.fullName).includes(gFullNorm)) { found = m; break; }
        }
        if (found) break;
      }
      if (found) {
        tw.push({ guest: g, mainGuest: found });
      } else {
        no.push(g);
      }
    }
    return { noFlight: no, travelingWith: tw };
  }, [guestsWithoutFlight, guestsWithFlight]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🤝 Meet & Greet</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="view-tabs">
            <button className={`view-tab${view === 'report' ? ' active' : ''}`} onClick={() => setView('report')}>📊 Report</button>
            <button className={`view-tab${view === 'email' ? ' active' : ''}`} onClick={() => setView('email')}>✉️ Email</button>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="it">Italiano</option>
          </select>
          <a href={api.exportMeetGreetUrl(token)} className="btn" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>📥 Excel</a>
          <button className="btn" onClick={checkFlights} disabled={flightLoading} style={{ whiteSpace: 'nowrap' }}>
            {flightLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Controllo...</> : '✈️ Controllo Voli'}
          </button>
          <button className="btn btn-primary" onClick={generate} disabled={generating || selected.length === 0}>
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Generazione...</> : '✉️ Genera Email'}
          </button>
        </div>
      </div>

      {/* ── Guest selector ── */}
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
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                <span style={{ fontWeight: 500, minWidth: 150 }}>{g.firstName} {g.lastName}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {arrFlight ? `${arrFlight.airline || ''} ${arrFlight.flightNumber || ''} — ${arrFlight.arrivalTime || ''}` : 'No flight'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── REPORT VIEW ── */}
      {view === 'report' && selectedGuests.length > 0 && (
        <div>
          {/* KPI */}
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">Ospiti selezionati</div><div className="stat-value">{selectedGuests.length}</div></div>
            <div className="stat-card"><div className="stat-label">Persone totali</div><div className="stat-value">{totalPeople}</div></div>
            <div className="stat-card"><div className="stat-label">Giorni arrivo</div><div className="stat-value">{arrivalsByDay.length}</div></div>
            <div className="stat-card"><div className="stat-label">Senza volo</div><div className="stat-value" style={{ color: noFlight.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{noFlight.length}</div></div>
          </div>

          {/* Arrivals by day */}
          {arrivalsByDay.map(([day, entries]) => (
            <div key={day} className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>📅 {day === 'TBD' ? 'Data da confermare' : formatDate(day)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entries.length} persone</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Ospite</th><th>Compagnia</th><th>Volo</th><th>Arrivo</th><th>Da</th></tr></thead>
                  <tbody>
                    {entries.sort((a, b) => (a.flight?.arrivalTime || '').localeCompare(b.flight?.arrivalTime || '')).map(({ guest: g, flight: f }) => (
                      <tr key={g.id} className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
                        <td style={{ fontWeight: 600 }}>{g.firstName} {g.lastName}</td>
                        <td style={{ fontSize: 12 }}>{f.airline || '-'}</td>
                        <td style={{ fontSize: 12 }}>{f.flightNumber || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{f.arrivalTime || '-'}</td>
                        <td style={{ fontSize: 12 }}>{f.departureAirport || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Guests traveling with main guest (no own flight but matched as companion) */}
          {travelingWith.length > 0 && (
            <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>👥 Viaggiano con ospite principale ({travelingWith.length})</div>
              <div style={{ fontSize: 13 }}>
                {travelingWith.map(({ guest: g, mainGuest: m }) => (
                  <div key={g.id} style={{ padding: '2px 0' }}>
                    • {g.firstName} {g.lastName} <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>→ volo di {m.firstName} {m.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truly missing flight guests */}
          {noFlight.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠️ Ospiti senza volo di arrivo ({noFlight.length})</div>
              <div style={{ fontSize: 13 }}>
                {noFlight.map(g => <div key={g.id} style={{ padding: '2px 0' }}>• {g.firstName} {g.lastName}</div>)}
              </div>
            </div>
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
            <button className="btn btn-sm btn-primary" onClick={copyToClipboard}>
              {copied ? '✅ Copiato!' : '📋 Copia'}
            </button>
          </div>
          <pre className="whatsapp-output" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 8, maxHeight: 600, overflowY: 'auto' }}>{email}</pre>
        </div>
      )}
      {view === 'email' && !email && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Premi "Genera Email" per creare il testo da inviare al fornitore di Meet & Greet.
        </div>
      )}
    </div>
  );
}
