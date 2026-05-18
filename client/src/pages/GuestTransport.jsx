import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

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

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);
  useEffect(() => {
    if (token) api.getGuests(token).then(g => { setGuests(g); setSelected(g.map(x => x.id)); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [token]);

  const toggleAll = () => {
    if (selected.length === guests.length) setSelected([]);
    else setSelected(guests.map(g => g.id));
  };
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateTransportEmail(selected, language, token);
      setEmail(result.email);
    } catch (e) { alert(e.message); }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="page-title">Transportation — Email Generator</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
        Seleziona gli ospiti e genera un testo email per la società di trasporto aeroporto → hotel.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.length === guests.length} onChange={toggleAll} />
              <strong>{selected.length}/{guests.length} ospiti selezionati</strong>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
            <button className="btn btn-primary" onClick={generate} disabled={generating || selected.length === 0}>
              {generating ? '⏳ Generazione...' : '🚐 Genera Email'}
            </button>
          </div>
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {guests.map(g => {
            const arrFlight = g.flights?.find(f => f.direction === 'ARRIVAL');
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                <span style={{ fontWeight: 500, minWidth: 160 }}>{g.firstName} {g.lastName}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {arrFlight ? `${arrFlight.airline || ''} ${arrFlight.flightNumber || ''} — ${arrFlight.arrivalTime || ''}` : 'No flight'}
                </span>
                {g.companions?.length > 0 && <span style={{ fontSize: 11, color: 'var(--primary)' }}>+{g.companions.length}</span>}
                {g.mobilityNeeds && g.mobilityNeeds.toLowerCase() !== 'none' && <span style={{ fontSize: 11, color: 'var(--danger)' }}>♿</span>}
              </label>
            );
          })}
        </div>
      </div>

      {email && (
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
    </div>
  );
}
