import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function GuestImport() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importId, setImportId] = useState(null);
  const [guests, setGuests] = useState([]);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.importGuestsUpload(formData, token);
      if (result.error) { setError(result.error); }
      else { setImportId(result.importId); setGuests(result.guests); }
    } catch (e) { setError(e.message); }
    setUploading(false);
  };

  const updateGuest = (idx, field, value) => {
    setGuests(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const removeGuest = (idx) => {
    setGuests(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (!importId || guests.length === 0) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await api.importGuestsConfirm(importId, guests, token);
      navigate('/guests');
    } catch (e) { setError(e.message); }
    setConfirming(false);
  };

  return (
    <div>
      <h1 className="page-title">Import Ospiti</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
        Carica un file Excel (.xlsx) con i dati degli ospiti. Il sistema analizzerà il file e ti mostrerà un'anteprima per revisione prima dell'importazione.
      </p>

      {!importId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.pdf" onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <div><strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)</div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <div>Trascina qui un file Excel o PDF</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Formati supportati: .xlsx, .xls, .pdf</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? '⏳ Analisi in corso...' : '📥 Analizza File'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="card" style={{ borderLeft: '4px solid var(--danger)', color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

      {guests.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontWeight: 600 }}>{guests.length} ospiti</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>estratti dal file — rivedi e conferma</span>
            </div>
            <div className="btn-group">
              <button className="btn" onClick={() => { setImportId(null); setGuests([]); setFile(null); }}>🔄 Nuovo Import</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={confirming}>
                {confirming ? '⏳ Importazione...' : `✅ Conferma Import (${guests.length})`}
              </button>
            </div>
          </div>

          {guests.map((g, idx) => (
            <div key={idx} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                <div>
                  <strong>{g.firstName} {g.lastName}</strong>
                  {g.companions?.length > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>+ {g.companions.map(c => c.fullName).join(', ')}</span>}
                  {g.flights?.length > 0 && <span style={{ color: 'var(--primary)', marginLeft: 8, fontSize: 12 }}>✈️ {g.flights[0]?.flightNumber || ''}</span>}
                </div>
                <div className="btn-group">
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expandedIdx === idx ? '▲' : '▼'}</span>
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); removeGuest(idx); }}>✕</button>
                </div>
              </div>

              {expandedIdx === idx && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div className="form-row-3">
                    <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={g.firstName || ''} onChange={e => updateGuest(idx, 'firstName', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Cognome</label><input className="form-input" value={g.lastName || ''} onChange={e => updateGuest(idx, 'lastName', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={g.email || ''} onChange={e => updateGuest(idx, 'email', e.target.value)} /></div>
                  </div>
                  <div className="form-row-3">
                    <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={g.phone || ''} onChange={e => updateGuest(idx, 'phone', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Camera</label><input className="form-input" value={g.roomType || ''} onChange={e => updateGuest(idx, 'roomType', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Dieta</label><input className="form-input" value={g.dietaryRestrictions || ''} onChange={e => updateGuest(idx, 'dietaryRestrictions', e.target.value)} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Richieste speciali</label><input className="form-input" value={g.specialRequests || ''} onChange={e => updateGuest(idx, 'specialRequests', e.target.value)} /></div>
                  {g.flights?.map((f, fi) => (
                    <div key={fi} style={{ padding: 8, background: '#f8fafc', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                      ✈️ {f.direction === 'ARRIVAL' ? '🛬' : '🛫'} {f.airline} {f.flightNumber} ({f.departureAirport} → {f.arrivalAirport}) {f.arrivalTime ? `arr. ${f.arrivalTime}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
