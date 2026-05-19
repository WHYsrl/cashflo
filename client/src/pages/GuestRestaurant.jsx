import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function GuestRestaurant() {
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
      const result = await api.generateRestaurantEmail(selected, language, token);
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
  const withDiet = useMemo(() => selectedGuests.filter(g => g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim())), [selectedGuests]);
  const noDiet = useMemo(() => selectedGuests.filter(g => !g.dietaryRestrictions || ['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim())), [selectedGuests]);

  const MEAL_SLOTS = [
    { key: '17giu_cena', label: '17/06 Cena' },
    { key: '18giu_pranzo', label: '18/06 Pranzo' },
    { key: '18giu_cena', label: '18/06 Cena' },
    { key: '19giu_pranzo', label: '19/06 Pranzo' },
    { key: '19giu_cena', label: '19/06 Cena' },
    { key: '20giu_pranzo', label: '20/06 Pranzo' },
    { key: '20giu_cena', label: '20/06 Cena' },
  ];

  const mealCounts = useMemo(() => {
    return MEAL_SLOTS.map(slot => {
      const attending = selectedGuests.filter(g => {
        const ma = g.mealAttendance;
        if (!ma) return true; // null = all meals
        return ma[slot.key] !== false;
      });
      const absent = selectedGuests.length - attending.length;
      const withDietMeal = attending.filter(g => g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim()));
      return { ...slot, attending: attending.length, absent, withDiet: withDietMeal.length };
    });
  }, [selectedGuests]);

  // Group by dietary type
  const dietByType = useMemo(() => {
    const map = {};
    withDiet.forEach(g => {
      const diet = g.dietaryRestrictions.toLowerCase().trim();
      // Categorize broadly
      let cat = g.dietaryRestrictions;
      if (diet.includes('kosher')) cat = 'Kosher';
      else if (diet.includes('vegetarian') || diet.includes('vegetariano')) cat = 'Vegetarian';
      else if (diet.includes('vegan')) cat = 'Vegan';
      else if (diet.includes('gluten')) cat = 'Gluten free';
      else if (diet.includes('halal')) cat = 'Halal';
      if (!map[cat]) map[cat] = [];
      map[cat].push(g);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [withDiet]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🍽️ Ristorante</h1>
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
            {generating ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', marginRight: 6 }} /> Generazione...</> : '🍽️ Genera Email'}
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
            const hasDiet = g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim());
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                <span style={{ fontWeight: 500, minWidth: 150 }}>{g.firstName} {g.lastName}</span>
                <span style={{ color: hasDiet ? 'var(--warning)' : 'var(--text-secondary)', fontSize: 12 }}>
                  {hasDiet ? g.dietaryRestrictions.substring(0, 50) : 'Nessuna restrizione'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── REPORT VIEW ── */}
      {view === 'report' && selectedGuests.length > 0 && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">Persone totali</div><div className="stat-value">{totalPeople}</div></div>
            <div className="stat-card"><div className="stat-label">Con restrizioni</div><div className="stat-value" style={{ color: withDiet.length > 0 ? 'var(--warning)' : undefined }}>{withDiet.length}</div></div>
            <div className="stat-card"><div className="stat-label">Senza restrizioni</div><div className="stat-value" style={{ color: 'var(--success)' }}>{noDiet.length}</div></div>
            <div className="stat-card"><div className="stat-label">Tipologie dieta</div><div className="stat-value">{dietByType.length}</div></div>
          </div>

          {/* Diet type summary cards */}
          {dietByType.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
              {dietByType.map(([type, gs]) => (
                <div key={type} className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{gs.length} persone</div>
                  {gs.map(g => (
                    <div key={g.id} style={{ fontSize: 13, padding: '2px 0' }}>
                      <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/guests/${g.id}`)}>★ {g.firstName} {g.lastName}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Meal attendance per day */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">🗓️ Presenze per pasto</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pasto</th><th>Presenti</th><th>Assenti</th><th>Con restrizioni</th></tr></thead>
                <tbody>
                  {mealCounts.map(m => (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{m.attending}</td>
                      <td style={{ color: m.absent > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{m.absent}</td>
                      <td style={{ color: m.withDiet > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>{m.withDiet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full participant table */}
          <div className="card">
            <div className="card-header"><div className="card-title">Lista completa partecipanti</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ospite</th><th>Restrizioni / Allergie</th><th>Pasti assenti</th></tr></thead>
                <tbody>
                  {selectedGuests.map(g => {
                    const hasDiet = g.dietaryRestrictions && !['none','n/a','no'].includes(g.dietaryRestrictions.toLowerCase().trim());
                    const ma = g.mealAttendance;
                    const skippedMeals = ma ? MEAL_SLOTS.filter(s => ma[s.key] === false).map(s => s.label) : [];
                    return (
                      <tr key={g.id} className="clickable-row" onClick={() => navigate(`/guests/${g.id}`)}>
                        <td style={{ fontWeight: 600 }}>{g.firstName} {g.lastName}</td>
                        <td style={{ color: hasDiet ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: hasDiet ? 500 : 400 }}>
                          {hasDiet ? g.dietaryRestrictions : 'Nessuna'}
                        </td>
                        <td style={{ fontSize: 12, color: skippedMeals.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          {skippedMeals.length > 0 ? skippedMeals.join(', ') : 'Tutti'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
          Premi "Genera Email" per creare il riepilogo alimentare da inviare al ristorante.
        </div>
      )}
    </div>
  );
}
