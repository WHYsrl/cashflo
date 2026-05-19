import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

export default function GuestHotel() {
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

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);
  useEffect(() => {
    if (token) api.getGuests(token).then(g => { setGuests(g); setSelected(g.map(x => x.id)); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const toggleAll = () => selected.length === guests.length ? setSelected([]) : setSelected(guests.map(g => g.id));
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateHotelEmail(selected, language, token);
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

  const selectedGuests = useMemo(() => guests.filter(g => selected.includes(g.id)), [guests, selected]);
  const totalPeople = useMemo(() => selectedGuests.length, [selectedGuests]);
  const totalRooms = useMemo(() => selectedGuests.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0), [selectedGuests]);
  const withSpecialNeeds = useMemo(() => selectedGuests.filter(g =>
    (g.specialRequests) ||
    (g.mobilityNeeds && !['none','n/a','no'].includes((g.mobilityNeeds||'').toLowerCase().trim())) ||
    (g.hotelUpgrade) ||
    (g.dietaryRestrictions && !['none','n/a','no'].includes((g.dietaryRestrictions||'').toLowerCase().trim()))
  ), [selectedGuests]);

  // Group by check-in date
  const checkinByDay = useMemo(() => {
    const map = {};
    selectedGuests.forEach(g => {
      if (!g.checkInDate) return;
      const day = g.checkInDate;
      if (!map[day]) map[day] = [];
      map[day].push(g);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedGuests]);

  const noCheckin = useMemo(() => selectedGuests.filter(g => !g.checkInDate), [selectedGuests]);

  // Group by room type
  const roomTypeSummary = useMemo(() => {
    const map = {};
    selectedGuests.forEach(g => {
      const rt = g.roomType || 'Non assegnata';
      if (!map[rt]) map[rt] = { count: 0, rooms: 0, guests: [] };
      map[rt].count += 1;
      map[rt].rooms += (g.hotelRoomsNeeded || 1);
      map[rt].guests.push(g);
    });
    return Object.entries(map).sort((a, b) => b[1].rooms - a[1].rooms);
  }, [selectedGuests]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🏨 Hotel</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="view-tabs">
            <button className={`view-tab${view === 'report' ? ' active' : ''}`} onClick={() => setView('report')}>📊 Report</button>
            <button className={`view-tab${view === 'email' ? ' active' : ''}`} onClick={() => setView('email')}>✉️ Email</button>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="it">Italiano</option>
          </select>
          <button className="btn btn-primary" onClick={generate} disabled={generating || selected.length === 0}>
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Generazione...</> : '🏨 Genera Email'}
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
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{totalPeople} persone, {totalRooms} camere</span>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {guests.map(g => {
            const hasNeeds = g.specialRequests || (g.mobilityNeeds && !['none','n/a','no'].includes((g.mobilityNeeds||'').toLowerCase().trim()));
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                <span style={{ fontWeight: 500, minWidth: 150 }}>{g.firstName} {g.lastName}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {g.roomType || 'No room'} {g.hotelRoomsNeeded ? `(${g.hotelRoomsNeeded})` : ''}
                </span>
                {hasNeeds && <span style={{ fontSize: 11, color: 'var(--warning)' }}>⚠️</span>}
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
            <div className="stat-card"><div className="stat-label">Ospiti</div><div className="stat-value">{selectedGuests.length}</div></div>
            <div className="stat-card"><div className="stat-label">Persone</div><div className="stat-value">{totalPeople}</div></div>
            <div className="stat-card"><div className="stat-label">Camere totali</div><div className="stat-value">{totalRooms}</div></div>
            <div className="stat-card"><div className="stat-label">Esigenze speciali</div><div className="stat-value" style={{ color: withSpecialNeeds.length > 0 ? 'var(--warning)' : undefined }}>{withSpecialNeeds.length}</div></div>
          </div>

          {/* Room type summary */}
          {roomTypeSummary.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {roomTypeSummary.map(([type, data]) => (
                <div key={type} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{data.rooms} camere — {data.count} persone</div>
                  {data.guests.map(g => (
                    <div key={g.id} style={{ fontSize: 13, padding: '2px 0' }}>
                      <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${g.id}`)}>★ {g.firstName} {g.lastName}</span>
                      {g.companions?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}> +{g.companions.map(c => c.fullName).join(', ')}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Special needs alerts */}
          {withSpecialNeeds.length > 0 && (
            <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid var(--warning)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠️ Esigenze speciali da evidenziare</div>
              {withSpecialNeeds.map(g => (
                <div key={g.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }} onClick={() => navigate(`/guests/${g.id}`)}>★ {g.firstName} {g.lastName}</span>
                  <div style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {g.specialRequests && <div>📝 {g.specialRequests}</div>}
                    {g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim()) && <div style={{ color: 'var(--danger)' }}>♿ {g.mobilityNeeds}</div>}
                    {g.hotelUpgrade && <div>⬆️ Upgrade: {g.hotelUpgrade}</div>}
                    {g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim()) && <div>🍽️ {g.dietaryRestrictions}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Check-in by day */}
          {checkinByDay.map(([day, gs]) => (
            <div key={day} className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>📅 Check-in {formatDate(day)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{gs.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0)} camere, {gs.length} persone</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Partecipante</th><th>Pax</th><th>Camera</th><th>N. Camere</th><th>Check-out</th><th>Esigenze / Note</th></tr></thead>
                  <tbody>
                    {gs.map(g => {
                      const hasNeeds = g.specialRequests || (g.mobilityNeeds && !['none','n/a','no'].includes((g.mobilityNeeds||'').toLowerCase().trim())) || g.hotelUpgrade;
                      return (
                        <React.Fragment key={g.id}>
                          <tr className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
                            <td style={{ fontWeight: 600 }}>★ {g.firstName} {g.lastName}</td>
                            <td style={{ textAlign: 'center' }}>1</td>
                            <td style={{ fontSize: 12 }}>{g.roomType || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{g.hotelRoomsNeeded || '-'}</td>
                            <td style={{ fontSize: 12 }}>{g.checkOutDate ? formatDate(g.checkOutDate) : '-'}</td>
                            <td style={{ fontSize: 11 }}>
                              {hasNeeds ? (
                                <span style={{ color: 'var(--warning)' }}>
                                  {[g.specialRequests, g.mobilityNeeds && !['none','n/a','no'].includes(g.mobilityNeeds.toLowerCase().trim()) ? `♿ ${g.mobilityNeeds}` : null, g.hotelUpgrade ? `⬆️ ${g.hotelUpgrade}` : null].filter(Boolean).join(' | ').substring(0, 60)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                          {g.companions?.map((c, i) => (
                            <tr key={`${g.id}-c${i}`} style={{ background: '#f8fafc' }}>
                              <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--text-secondary)' }}>👤 {c.fullName}</td>
                              <td colSpan={5} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.relationship || 'Accompagnatore'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* No check-in guests */}
          {noCheckin.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠️ Ospiti senza data check-in ({noCheckin.length})</div>
              <div style={{ fontSize: 13 }}>
                {noCheckin.map(g => (
                  <div key={g.id} style={{ padding: '2px 0' }}>• {g.firstName} {g.lastName} — {g.roomType || 'Nessuna camera'}</div>
                ))}
              </div>
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
          Premi "Genera Email" per creare il riepilogo da inviare all'hotel.
        </div>
      )}
    </div>
  );
}
