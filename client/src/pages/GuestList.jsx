import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

function useGuestAuth() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  useEffect(() => { if (!token) navigate('/guests/login'); }, [token, navigate]);
  return token;
}

/* ── All available columns with metadata ── */
/* sortValue: extracts a sortable primitive (string/number) from a guest */
const ALL_COLUMNS = [
  // Personal
  { key: 'name', label: 'Ospite', group: 'Anagrafica', default: true, render: g => `${g.firstName} ${g.lastName}`, sortValue: g => `${g.lastName} ${g.firstName}`.toLowerCase(), bold: true },
  { key: 'email', label: 'Email', group: 'Anagrafica', default: false, render: g => g.email || '-', sortValue: g => (g.email || '').toLowerCase() },
  { key: 'phone', label: 'Telefono', group: 'Anagrafica', default: false, render: g => g.phone || '-', sortValue: g => g.phone || '' },
  { key: 'phoneOffice', label: 'Tel. Ufficio', group: 'Anagrafica', default: false, render: g => g.phoneOffice || '-', sortValue: g => g.phoneOffice || '' },
  { key: 'mailingAddress', label: 'Indirizzo', group: 'Anagrafica', default: false, render: g => g.mailingAddress || '-', sortValue: g => (g.mailingAddress || '').toLowerCase() },
  { key: 'city', label: 'Città', group: 'Anagrafica', default: false, render: g => g.city || '-', sortValue: g => (g.city || '').toLowerCase() },
  { key: 'state', label: 'Stato', group: 'Anagrafica', default: false, render: g => g.state || '-', sortValue: g => (g.state || '').toLowerCase() },
  { key: 'zip', label: 'CAP', group: 'Anagrafica', default: false, render: g => g.zip || '-', sortValue: g => g.zip || '' },
  // Companions
  { key: 'companions', label: 'Accompagnatori', group: 'Anagrafica', default: true, render: g => g.companions?.map(c => c.fullName).join(', ') || '-', sortValue: g => g.companions?.length || 0, small: true },
  { key: 'pax', label: 'Persone', group: 'Anagrafica', default: true, render: g => 1 + (g.companions?.length || 0), sortValue: g => 1 + (g.companions?.length || 0) },
  // Flight
  { key: 'arrivalFlight', label: 'Volo Arrivo', group: 'Voli', default: true, render: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f ? `${f.airline || ''} ${f.flightNumber || ''}`.trim() || '-' : '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f ? `${f.airline || ''} ${f.flightNumber || ''}` : ''; }, small: true },
  { key: 'arrivalDate', label: 'Arrivo', group: 'Voli', default: true, render: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f ? `${f.arrivalDay ? formatDate(f.arrivalDay) : f.date ? formatDate(f.date) : '-'}${f.arrivalTime ? ` ${f.arrivalTime}` : ''}` : '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f ? `${f.arrivalDay || f.date || ''}${f.arrivalTime || ''}` : ''; }, small: true },
  { key: 'arrivalFrom', label: 'Da', group: 'Voli', default: false, render: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f?.departureAirport || '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return (f?.departureAirport || '').toLowerCase(); }, small: true },
  { key: 'arrivalTo', label: 'A', group: 'Voli', default: false, render: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return f?.arrivalAirport || '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'ARRIVAL'); return (f?.arrivalAirport || '').toLowerCase(); }, small: true },
  { key: 'departureFlight', label: 'Volo Partenza', group: 'Voli', default: false, render: g => { const f = g.flights?.find(f => f.direction === 'DEPARTURE'); return f ? `${f.airline || ''} ${f.flightNumber || ''}`.trim() || '-' : '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'DEPARTURE'); return f ? `${f.airline || ''} ${f.flightNumber || ''}` : ''; }, small: true },
  { key: 'departureDate', label: 'Partenza', group: 'Voli', default: false, render: g => { const f = g.flights?.find(f => f.direction === 'DEPARTURE'); return f ? `${f.date ? formatDate(f.date) : '-'}${f.departureTime ? ` ${f.departureTime}` : ''}` : '-'; }, sortValue: g => { const f = g.flights?.find(f => f.direction === 'DEPARTURE'); return f ? `${f.date || ''}${f.departureTime || ''}` : ''; }, small: true },
  // Hotel
  { key: 'roomType', label: 'Camera', group: 'Hotel', default: true, render: g => g.roomType || '-', sortValue: g => (g.roomType || '').toLowerCase(), small: true },
  { key: 'hotelRoomsNeeded', label: 'N. Camere', group: 'Hotel', default: false, render: g => g.hotelRoomsNeeded || '-', sortValue: g => g.hotelRoomsNeeded || 0 },
  { key: 'checkIn', label: 'Check-in', group: 'Hotel', default: true, render: g => g.checkInDate ? formatDate(g.checkInDate) : '-', sortValue: g => g.checkInDate || '', small: true },
  { key: 'checkOut', label: 'Check-out', group: 'Hotel', default: false, render: g => g.checkOutDate ? formatDate(g.checkOutDate) : '-', sortValue: g => g.checkOutDate || '', small: true },
  { key: 'hotelUpgrade', label: 'Upgrade', group: 'Hotel', default: false, render: g => g.hotelUpgrade || '-', sortValue: g => (g.hotelUpgrade || '').toLowerCase(), small: true },
  // Dietary & Medical
  { key: 'dietary', label: 'Dieta', group: 'Dieta & Salute', default: true, render: g => g.dietaryRestrictions && g.dietaryRestrictions.toLowerCase() !== 'none' ? g.dietaryRestrictions.substring(0, 30) + (g.dietaryRestrictions.length > 30 ? '...' : '') : '-', sortValue: g => (g.dietaryRestrictions || '').toLowerCase(), small: true },
  { key: 'mobility', label: 'Mobilità', group: 'Dieta & Salute', default: false, render: g => g.mobilityNeeds && !['none','n/a','no'].includes((g.mobilityNeeds||'').toLowerCase().trim()) ? g.mobilityNeeds : '-', sortValue: g => (g.mobilityNeeds || '').toLowerCase(), small: true },
  { key: 'medical', label: 'Info Mediche', group: 'Dieta & Salute', default: false, render: g => g.medicalInfo || '-', sortValue: g => (g.medicalInfo || '').toLowerCase(), small: true },
  { key: 'healthAttestation', label: 'Attestazione Salute', group: 'Dieta & Salute', default: false, render: g => g.healthAttestation ? '✅' : '—', sortValue: g => g.healthAttestation ? 1 : 0 },
  // Passport
  { key: 'passportCountry', label: 'Paese Passaporto', group: 'Passaporto', default: false, render: g => g.passportCountry || '-', sortValue: g => (g.passportCountry || '').toLowerCase() },
  { key: 'passportNumber', label: 'N. Passaporto', group: 'Passaporto', default: false, render: g => g.passportNumber || '-', sortValue: g => g.passportNumber || '' },
  { key: 'passportExpiry', label: 'Scadenza Pass.', group: 'Passaporto', default: false, render: g => g.passportExpiry || '-', sortValue: g => g.passportExpiry || '', small: true },
  { key: 'dateOfBirth', label: 'Data Nascita', group: 'Passaporto', default: false, render: g => g.dateOfBirth || '-', sortValue: g => g.dateOfBirth || '', small: true },
  // Special
  { key: 'specialRequests', label: 'Richieste Speciali', group: 'Extra', default: false, render: g => g.specialRequests ? g.specialRequests.substring(0, 40) + (g.specialRequests.length > 40 ? '...' : '') : '-', sortValue: g => (g.specialRequests || '').toLowerCase(), small: true },
  { key: 'notes', label: 'Note', group: 'Extra', default: false, render: g => g.notes ? g.notes.substring(0, 40) + (g.notes.length > 40 ? '...' : '') : '-', sortValue: g => (g.notes || '').toLowerCase(), small: true },
  { key: 'bio', label: 'Bio', group: 'Extra', default: false, render: g => g.bio ? g.bio.substring(0, 40) + (g.bio.length > 40 ? '...' : '') : '-', sortValue: g => (g.bio || '').toLowerCase(), small: true },
  { key: 'whatsapp', label: 'WhatsApp', group: 'Extra', default: false, render: g => g.whatsappOptIn ? '✅' : '—', sortValue: g => g.whatsappOptIn ? 1 : 0 },
  // Assistant
  { key: 'assistantName', label: 'Assistente', group: 'Contatti', default: false, render: g => g.assistantName || '-', sortValue: g => (g.assistantName || '').toLowerCase() },
  { key: 'assistantEmail', label: 'Email Assist.', group: 'Contatti', default: false, render: g => g.assistantEmail || '-', sortValue: g => (g.assistantEmail || '').toLowerCase(), small: true },
  { key: 'assistantPhone', label: 'Tel. Assist.', group: 'Contatti', default: false, render: g => g.assistantPhone || '-', sortValue: g => g.assistantPhone || '', small: true },
  // Emergency
  { key: 'emergencyName', label: 'Emergenza', group: 'Contatti', default: false, render: g => g.emergencyName || '-', sortValue: g => (g.emergencyName || '').toLowerCase() },
  { key: 'emergencyPhone', label: 'Tel. Emergenza', group: 'Contatti', default: false, render: g => g.emergencyPhone || '-', sortValue: g => g.emergencyPhone || '', small: true },
  // Consent
  { key: 'privacyConsent', label: 'Privacy', group: 'Consensi', default: false, render: g => g.privacyConsent ? '✅' : '❌', sortValue: g => g.privacyConsent ? 1 : 0 },
  { key: 'imageRights', label: 'Dir. Immagine', group: 'Consensi', default: false, render: g => g.imageRightsConsent ? '✅' : '❌', sortValue: g => g.imageRightsConsent ? 1 : 0 },
  { key: 'liability', label: 'Responsabilità', group: 'Consensi', default: false, render: g => g.liabilityConsent ? '✅' : '❌', sortValue: g => g.liabilityConsent ? 1 : 0 },
  { key: 'cancellation', label: 'Cancellazione', group: 'Consensi', default: false, render: g => g.cancellationConsent ? '✅' : '❌', sortValue: g => g.cancellationConsent ? 1 : 0 },
  { key: 'insurance', label: 'Assicurazione', group: 'Consensi', default: false, render: g => g.insuranceConsent ? '✅' : '❌', sortValue: g => g.insuranceConsent ? 1 : 0 },
];

const DEFAULT_COLS = ALL_COLUMNS.filter(c => c.default).map(c => c.key);
const GROUPS = [...new Set(ALL_COLUMNS.map(c => c.group))];

function ColumnPicker({ visible, onClose, activeCols, setActiveCols }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const toggleCol = (key) => {
    setActiveCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const toggleGroup = (group) => {
    const groupKeys = ALL_COLUMNS.filter(c => c.group === group).map(c => c.key);
    const allOn = groupKeys.every(k => activeCols.includes(k));
    if (allOn) setActiveCols(prev => prev.filter(k => !groupKeys.includes(k)));
    else setActiveCols(prev => [...new Set([...prev, ...groupKeys])]);
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
      background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 12,
      width: 340, maxHeight: 420, overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Colonne visibili</span>
        <button className="btn btn-sm" onClick={() => setActiveCols(DEFAULT_COLS)} style={{ fontSize: 11 }}>Reset default</button>
      </div>
      {GROUPS.map(group => {
        const groupCols = ALL_COLUMNS.filter(c => c.group === group);
        const allOn = groupCols.every(c => activeCols.includes(c.key));
        const someOn = groupCols.some(c => activeCols.includes(c.key));
        return (
          <div key={group} style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12, color: 'var(--primary)', padding: '4px 0' }}>
              <input type="checkbox" checked={allOn} ref={el => { if (el) el.indeterminate = someOn && !allOn; }} onChange={() => toggleGroup(group)} />
              {group}
            </label>
            <div style={{ paddingLeft: 16 }}>
              {groupCols.map(col => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}>
                  <input type="checkbox" checked={activeCols.includes(col.key)} onChange={() => toggleCol(col.key)} />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GuestList() {
  const token = useGuestAuth();
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('table');
  const [activeCols, setActiveCols] = useState(() => {
    try { const saved = localStorage.getItem('guestListCols'); return saved ? JSON.parse(saved) : DEFAULT_COLS; } catch { return DEFAULT_COLS; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  useEffect(() => { localStorage.setItem('guestListCols', JSON.stringify(activeCols)); }, [activeCols]);

  useEffect(() => {
    if (token) api.getGuests(token).then(setGuests).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const filtered = guests.filter(g =>
    `${g.firstName} ${g.lastName} ${g.email || ''} ${g.companions?.map(c => c.fullName).join(' ') || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns = ALL_COLUMNS.filter(c => activeCols.includes(c.key));

  const sorted = useMemo(() => {
    const col = ALL_COLUMNS.find(c => c.key === sortCol);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  };

  const totalPeople = guests.reduce((s, g) => s + 1 + (g.companions?.length || 0), 0);
  const totalRooms = guests.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0);
  const withFlights = guests.filter(g => g.flights?.some(f => f.direction === 'ARRIVAL')).length;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ospiti</h1>
        <div className="btn-group">
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/guests/new')}>+ Nuovo Ospite</button>
          <button className="btn btn-sm" onClick={() => navigate('/guests/import')}>📥 Import</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Ospiti</div><div className="stat-value">{guests.length}</div></div>
        <div className="stat-card"><div className="stat-label">Persone totali</div><div className="stat-value">{totalPeople}</div></div>
        <div className="stat-card"><div className="stat-label">Camere</div><div className="stat-value">{totalRooms}</div></div>
        <div className="stat-card"><div className="stat-label">Con volo</div><div className="stat-value">{withFlights}/{guests.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Cerca ospite..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <div className="view-tabs">
          <button className={`view-tab${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>Tabella</button>
          <button className={`view-tab${view === 'cards' ? ' active' : ''}`} onClick={() => setView('cards')}>Schede</button>
        </div>
        {view === 'table' && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button className="btn btn-sm" onClick={() => setPickerOpen(!pickerOpen)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ⚙️ Colonne ({activeCols.length})
            </button>
            <ColumnPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} activeCols={activeCols} setActiveCols={setActiveCols} />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nessun ospite trovato. <a href="#" onClick={e => { e.preventDefault(); navigate('/guests/import'); }}>Importa dati →</a></div>
      ) : view === 'table' ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{columns.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {col.label} {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : <span style={{ opacity: 0.25 }}>▲</span>}
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {sorted.map(g => (
                  <tr key={g.id} className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
                    {columns.map(col => (
                      <td key={col.key} style={{ fontWeight: col.bold ? 600 : 400, fontSize: col.small ? 12 : undefined }}>
                        {col.render(g)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map(g => {
            const arrFlight = g.flights?.find(f => f.direction === 'ARRIVAL');
            return (
              <div key={g.id} className="card clickable-row" onClick={() => navigate(`/guests/${g.id}`)} style={{ cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{g.firstName} {g.lastName}</div>
                {g.companions?.length > 0 && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>+ {g.companions.map(c => c.fullName).join(', ')}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13, marginTop: 8 }}>
                  {arrFlight && <div>✈️ {arrFlight.airline} {arrFlight.flightNumber}</div>}
                  {arrFlight?.arrivalTime && <div>🕐 {arrFlight.arrivalTime}</div>}
                  {g.roomType && <div>🏨 {g.roomType}</div>}
                  {g.checkInDate && <div>📅 {formatDate(g.checkInDate)}</div>}
                </div>
                {g.dietaryRestrictions && g.dietaryRestrictions.toLowerCase() !== 'none' && (
                  <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 8 }}>🍽️ {g.dietaryRestrictions}</div>
                )}
                {g.specialRequests && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>⚠️ {g.specialRequests.substring(0, 60)}...</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
