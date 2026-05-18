import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

export default function GuestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [flightModal, setFlightModal] = useState(null);
  const [compModal, setCompModal] = useState(false);

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);

  const load = useCallback(() => {
    if (token) api.getGuest(id, token).then(g => { setGuest(g); setEditForm(g); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [id, token]);
  useEffect(() => { load(); }, [load]);

  const handleSaveEdit = async () => {
    await api.updateGuest(id, editForm, token);
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirm('Eliminare questo ospite?')) return;
    await api.deleteGuest(id, token);
    navigate('/guests');
  };

  const handleAddFlight = async (data) => {
    await api.addFlight(id, data, token);
    setFlightModal(null);
    load();
  };

  const handleDeleteFlight = async (fid) => {
    if (!confirm('Eliminare questo volo?')) return;
    await api.deleteFlight(id, fid, token);
    load();
  };

  const handleAddCompanion = async (data) => {
    await api.addCompanion(id, data, token);
    setCompModal(false);
    load();
  };

  const handleDeleteCompanion = async (cid) => {
    if (!confirm('Eliminare questo accompagnatore?')) return;
    await api.deleteCompanion(id, cid, token);
    load();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!guest) return <div className="empty">Ospite non trovato</div>;

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const arrFlight = guest.flights?.find(f => f.direction === 'ARRIVAL');
  const depFlight = guest.flights?.find(f => f.direction === 'DEPARTURE');

  return (
    <div>
      <button className="btn btn-sm" onClick={() => navigate('/guests')} style={{ marginBottom: 16 }}>← Ospiti</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{guest.firstName} {guest.lastName}</h1>
          {guest.companions?.length > 0 && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>+ {guest.companions.map(c => c.fullName).join(', ')}</div>}
        </div>
        <div className="btn-group">
          <button className="btn btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Annulla' : '✏️ Modifica'}</button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑 Elimina</button>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Dati Personali</div>
          <div className="form-row-3">
            <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={editForm.firstName || ''} onChange={e => set('firstName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Cognome</label><input className="form-input" value={editForm.lastName || ''} onChange={e => set('lastName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email || ''} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="form-row-3">
            <div className="form-group"><label className="form-label">Cellulare</label><input className="form-input" value={editForm.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tel. ufficio</label><input className="form-input" value={editForm.phoneOffice || ''} onChange={e => set('phoneOffice', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Città</label><input className="form-input" value={editForm.city || ''} onChange={e => set('city', e.target.value)} /></div>
          </div>
          <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>Hotel</div>
          <div className="form-row-3">
            <div className="form-group"><label className="form-label">Tipo camera</label><input className="form-input" value={editForm.roomType || ''} onChange={e => set('roomType', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Check-in</label><input className="form-input" type="date" value={editForm.checkInDate ? editForm.checkInDate.substring(0, 10) : ''} onChange={e => set('checkInDate', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Check-out</label><input className="form-input" type="date" value={editForm.checkOutDate ? editForm.checkOutDate.substring(0, 10) : ''} onChange={e => set('checkOutDate', e.target.value)} /></div>
          </div>
          <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>Esigenze</div>
          <div className="form-group"><label className="form-label">Restrizioni alimentari</label><input className="form-input" value={editForm.dietaryRestrictions || ''} onChange={e => set('dietaryRestrictions', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Esigenze mobilità</label><input className="form-input" value={editForm.mobilityNeeds || ''} onChange={e => set('mobilityNeeds', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Info mediche</label><textarea className="form-textarea" value={editForm.medicalInfo || ''} onChange={e => set('medicalInfo', e.target.value)} /></div>
          <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>Contatti emergenza</div>
          <div className="form-row-3">
            <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={editForm.emergencyName || ''} onChange={e => set('emergencyName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={editForm.emergencyPhone || ''} onChange={e => set('emergencyPhone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Relazione</label><input className="form-input" value={editForm.emergencyRelation || ''} onChange={e => set('emergencyRelation', e.target.value)} /></div>
          </div>
          <div className="card-title" style={{ marginTop: 16, marginBottom: 8 }}>Bio & Note</div>
          <div className="form-group"><label className="form-label">Bio</label><textarea className="form-textarea" value={editForm.bio || ''} onChange={e => set('bio', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Richieste speciali</label><textarea className="form-textarea" value={editForm.specialRequests || ''} onChange={e => set('specialRequests', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Note</label><textarea className="form-textarea" value={editForm.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Salva Modifiche</button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{guest.email || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Cellulare:</span> <strong>{guest.phone || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Tel. ufficio:</span> <strong>{guest.phoneOffice || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Città:</span> <strong>{[guest.city, guest.state].filter(Boolean).join(', ') || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Camera:</span> <strong>{guest.roomType || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Check-in:</span> <strong>{guest.checkInDate ? formatDate(guest.checkInDate) : '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Check-out:</span> <strong>{guest.checkOutDate ? formatDate(guest.checkOutDate) : '-'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Camere:</span> <strong>{guest.hotelRoomsNeeded || '-'}</strong></div>
              {guest.dietaryRestrictions && guest.dietaryRestrictions.toLowerCase() !== 'none' && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--warning)' }}>🍽️ Dieta:</span> <strong>{guest.dietaryRestrictions}</strong></div>
              )}
              {guest.mobilityNeeds && guest.mobilityNeeds.toLowerCase() !== 'none' && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--danger)' }}>♿ Mobilità:</span> <strong>{guest.mobilityNeeds}</strong></div>
              )}
              {guest.medicalInfo && guest.medicalInfo.toLowerCase() !== 'none' && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>🏥 Info mediche:</span> {guest.medicalInfo}</div>
              )}
              {guest.specialRequests && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>⚠️ Richieste:</span> {guest.specialRequests}</div>
              )}
              {guest.bio && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>📝 Bio:</span> {guest.bio}</div>
              )}
            </div>
          </div>

          {/* Emergency & Assistant */}
          {(guest.emergencyName || guest.assistantName) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
                {guest.emergencyName && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Contatto Emergenza</div>
                    <div>{guest.emergencyName} {guest.emergencyRelation ? `(${guest.emergencyRelation})` : ''}</div>
                    {guest.emergencyPhone && <div style={{ fontSize: 12 }}>📞 {guest.emergencyPhone}</div>}
                    {guest.emergencyEmail && <div style={{ fontSize: 12 }}>✉️ {guest.emergencyEmail}</div>}
                  </div>
                )}
                {guest.assistantName && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Assistente</div>
                    <div>{guest.assistantName}</div>
                    {guest.assistantPhone && <div style={{ fontSize: 12 }}>📞 {guest.assistantPhone}</div>}
                    {guest.assistantEmail && <div style={{ fontSize: 12 }}>✉️ {guest.assistantEmail}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Companions */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Accompagnatori</div>
          <button className="btn btn-sm btn-primary" onClick={() => setCompModal(true)}>+ Accompagnatore</button>
        </div>
        {!guest.companions?.length ? <div className="empty">Nessun accompagnatore</div> : (
          <table>
            <thead><tr><th>Nome</th><th>Relazione</th><th></th></tr></thead>
            <tbody>
              {guest.companions.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.fullName}</td>
                  <td>{c.relationship || '-'}</td>
                  <td><button className="btn btn-sm" onClick={() => handleDeleteCompanion(c.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Flights */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Voli</div>
          <button className="btn btn-sm btn-primary" onClick={() => setFlightModal({})}>+ Volo</button>
        </div>
        {!guest.flights?.length ? <div className="empty">Nessun volo registrato</div> : (
          <table>
            <thead><tr><th>Direzione</th><th>Compagnia</th><th>N. Volo</th><th>Da</th><th>A</th><th>Data</th><th>Partenza</th><th>Arrivo</th><th></th></tr></thead>
            <tbody>
              {guest.flights.map(f => (
                <tr key={f.id}>
                  <td><span className="badge" style={{ background: f.direction === 'ARRIVAL' ? '#ecfdf5' : '#fef2f2', color: f.direction === 'ARRIVAL' ? 'var(--success)' : 'var(--danger)' }}>{f.direction === 'ARRIVAL' ? '🛬 Arrivo' : '🛫 Partenza'}</span></td>
                  <td>{f.airline || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{f.flightNumber || '-'}</td>
                  <td>{f.departureAirport || '-'}</td>
                  <td>{f.arrivalAirport || '-'}</td>
                  <td>{f.date ? formatDate(f.date) : '-'}</td>
                  <td>{f.departureTime || '-'}</td>
                  <td>{f.arrivalTime || '-'}{f.arrivalDay ? ` (${formatDate(f.arrivalDay)})` : ''}</td>
                  <td><button className="btn btn-sm" onClick={() => handleDeleteFlight(f.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {flightModal !== null && <FlightModal onClose={() => setFlightModal(null)} onSave={handleAddFlight} />}
      {compModal && <CompanionModal onClose={() => setCompModal(false)} onSave={handleAddCompanion} />}
    </div>
  );
}

function FlightModal({ onClose, onSave }) {
  const [form, setForm] = useState({ direction: 'ARRIVAL', departureAirport: '', arrivalAirport: '', airline: '', flightNumber: '', date: '', departureTime: '', arrivalDay: '', arrivalTime: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Aggiungi Volo</div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Direzione</label>
            <select className="form-select" value={form.direction} onChange={e => set('direction', e.target.value)}><option value="ARRIVAL">Arrivo</option><option value="DEPARTURE">Partenza</option></select>
          </div>
          <div className="form-group"><label className="form-label">Compagnia</label><input className="form-input" value={form.airline} onChange={e => set('airline', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">N. Volo</label><input className="form-input" value={form.flightNumber} onChange={e => set('flightNumber', e.target.value)} /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Da</label><input className="form-input" value={form.departureAirport} onChange={e => set('departureAirport', e.target.value)} placeholder="LAX" /></div>
          <div className="form-group"><label className="form-label">A</label><input className="form-input" value={form.arrivalAirport} onChange={e => set('arrivalAirport', e.target.value)} placeholder="FCO" /></div>
          <div className="form-group"><label className="form-label">Data partenza</label><input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Ora partenza</label><input className="form-input" value={form.departureTime} onChange={e => set('departureTime', e.target.value)} placeholder="3:15PM" /></div>
          <div className="form-group"><label className="form-label">Giorno arrivo</label><input className="form-input" type="date" value={form.arrivalDay} onChange={e => set('arrivalDay', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Ora arrivo</label><input className="form-input" value={form.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} placeholder="11:55AM" /></div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Salva</button>
        </div>
      </div>
    </div>
  );
}

function CompanionModal({ onClose, onSave }) {
  const [form, setForm] = useState({ fullName: '', relationship: '' });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Aggiungi Accompagnatore</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nome completo</label><input className="form-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Relazione</label><input className="form-input" value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Spouse, Partner, etc." /></div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.fullName}>Salva</button>
        </div>
      </div>
    </div>
  );
}
