import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

function useGuestAuth() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  useEffect(() => { if (!token) navigate('/guests/login'); }, [token, navigate]);
  return token;
}

export default function GuestList() {
  const token = useGuestAuth();
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('table'); // table | cards

  useEffect(() => {
    if (token) api.getGuests(token).then(setGuests).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const filtered = guests.filter(g =>
    `${g.firstName} ${g.lastName} ${g.email || ''} ${g.companions?.map(c => c.fullName).join(' ') || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalPeople = guests.reduce((s, g) => s + 1 + (g.companions?.length || 0), 0);
  const totalRooms = guests.reduce((s, g) => s + (g.hotelRoomsNeeded || 0), 0);
  const withFlights = guests.filter(g => g.flights?.some(f => f.direction === 'ARRIVAL')).length;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ospiti</h1>
        <div className="btn-group">
          <button className="btn btn-sm" onClick={() => navigate('/guests/import')}>📥 Import</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Ospiti</div><div className="stat-value">{guests.length}</div></div>
        <div className="stat-card"><div className="stat-label">Persone totali</div><div className="stat-value">{totalPeople}</div></div>
        <div className="stat-card"><div className="stat-label">Camere</div><div className="stat-value">{totalRooms}</div></div>
        <div className="stat-card"><div className="stat-label">Con volo</div><div className="stat-value">{withFlights}/{guests.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input className="form-input" placeholder="Cerca ospite..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <div className="view-tabs">
          <button className={`view-tab${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')}>Tabella</button>
          <button className={`view-tab${view === 'cards' ? ' active' : ''}`} onClick={() => setView('cards')}>Schede</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nessun ospite trovato. <a href="#" onClick={e => { e.preventDefault(); navigate('/guests/import'); }}>Importa dati →</a></div>
      ) : view === 'table' ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ospite</th><th>Accompagnatori</th><th>Persone</th><th>Volo Arrivo</th><th>Arrivo</th><th>Hotel</th><th>Check-in</th><th>Dieta</th></tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const arrFlight = g.flights?.find(f => f.direction === 'ARRIVAL');
                  const compCount = g.companions?.length || 0;
                  return (
                    <tr key={g.id} className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
                      <td style={{ fontWeight: 600 }}>{g.firstName} {g.lastName}</td>
                      <td style={{ fontSize: 12 }}>{g.companions?.map(c => c.fullName).join(', ') || '-'}</td>
                      <td>{1 + compCount}</td>
                      <td style={{ fontSize: 12 }}>{arrFlight ? `${arrFlight.airline || ''} ${arrFlight.flightNumber || ''}`.trim() || '-' : '-'}</td>
                      <td style={{ fontSize: 12 }}>{arrFlight?.arrivalDay ? formatDate(arrFlight.arrivalDay) : arrFlight?.date ? formatDate(arrFlight.date) : '-'}{arrFlight?.arrivalTime ? ` ${arrFlight.arrivalTime}` : ''}</td>
                      <td style={{ fontSize: 12 }}>{g.roomType || '-'}</td>
                      <td style={{ fontSize: 12 }}>{g.checkInDate ? formatDate(g.checkInDate) : '-'}</td>
                      <td style={{ fontSize: 11 }}>{g.dietaryRestrictions && g.dietaryRestrictions.toLowerCase() !== 'none' ? g.dietaryRestrictions.substring(0, 30) + (g.dietaryRestrictions.length > 30 ? '...' : '') : '-'}</td>
                    </tr>
                  );
                })}
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
