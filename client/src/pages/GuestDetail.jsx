import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatDate } from '../utils/format.js';

export default function GuestDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [editForm, setEditForm] = useState({});
  const [flightModal, setFlightModal] = useState(null);
  const [compModal, setCompModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);

  const load = useCallback(() => {
    if (isNew) {
      const blank = { firstName: '', lastName: '', fullName: '', email: '', phone: '', phoneOffice: '', mailingAddress: '', city: '', state: '', zip: '', hotelRoomsNeeded: null, roomType: '', checkInDate: '', checkOutDate: '', hotelUpgrade: '', noTransfer: false, passportCountry: '', passportNumber: '', passportExpiry: '', dateOfBirth: '', dietaryRestrictions: '', mobilityNeeds: '', medicalInfo: '', healthAttestation: false, assistantName: '', assistantEmail: '', assistantPhone: '', emergencyName: '', emergencyPhone: '', emergencyEmail: '', emergencyRelation: '', bio: '', whatsappOptIn: false, specialRequests: '', notes: '', privacyConsent: false, imageRightsConsent: false, liabilityConsent: false, cancellationConsent: false, insuranceConsent: false, mealAttendance: null, companions: [], flights: [] };
      setGuest(blank);
      setEditForm(blank);
      return;
    }
    if (token) api.getGuest(id, token).then(g => { setGuest(g); setEditForm(g); }).catch(() => navigate('/guests/login')).finally(() => setLoading(false));
  }, [id, token, isNew]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const result = await api.createGuest({ ...editForm, fullName: `${editForm.firstName} ${editForm.lastName}`.trim() }, token);
        navigate(`/guests/${result.id}`, { replace: true });
      } else {
        await api.updateGuest(id, editForm, token);
        setEditing(false);
        load();
      }
    } catch (e) {
      alert('Errore: ' + e.message);
    }
    setSaving(false);
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

  const sections = [
    { key: 'personal', label: 'Dati Personali', icon: '👤' },
    { key: 'hotel', label: 'Hotel', icon: '🏨' },
    { key: 'passport', label: 'Passaporto', icon: '🛂' },
    { key: 'dietary', label: 'Esigenze & Dieta', icon: '🍽️' },
    { key: 'contacts', label: 'Emergenza & Assistente', icon: '📞' },
    { key: 'meals', label: 'Pasti', icon: '🗓️' },
    { key: 'bio', label: 'Bio & Note', icon: '📝' },
    { key: 'consent', label: 'Privacy & Consensi', icon: '🔒' },
  ];

  return (
    <div>
      <button className="btn btn-sm" onClick={() => navigate('/guests')} style={{ marginBottom: 16 }}>← Ospiti</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{isNew ? 'Nuovo Ospite' : `${guest.firstName} ${guest.lastName}`}</h1>
          {!isNew && guest.companions?.length > 0 && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>+ {guest.companions.map(c => c.fullName).join(', ')}</div>}
        </div>
        {!isNew && (
          <div className="btn-group">
            <button className="btn btn-sm" onClick={() => { setEditing(!editing); if (editing) setEditForm(guest); }}>{editing ? 'Annulla' : '✏️ Modifica'}</button>
            <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑 Elimina</button>
          </div>
        )}
      </div>

      {editing ? (
        <div>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {sections.map(s => (
              <button key={s.key} className={`btn btn-sm${activeSection === s.key ? ' btn-primary' : ''}`}
                onClick={() => setActiveSection(s.key)} style={{ fontSize: 12 }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            {activeSection === 'personal' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Dati Personali</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={editForm.firstName || ''} onChange={e => set('firstName', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Cognome *</label><input className="form-input" value={editForm.lastName || ''} onChange={e => set('lastName', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={editForm.email || ''} onChange={e => set('email', e.target.value)} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Cellulare</label><input className="form-input" value={editForm.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Tel. ufficio</label><input className="form-input" value={editForm.phoneOffice || ''} onChange={e => set('phoneOffice', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Data di nascita</label><input className="form-input" value={editForm.dateOfBirth || ''} onChange={e => set('dateOfBirth', e.target.value)} placeholder="dd/mm/yyyy" /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Indirizzo</label><input className="form-input" value={editForm.mailingAddress || ''} onChange={e => set('mailingAddress', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Città</label><input className="form-input" value={editForm.city || ''} onChange={e => set('city', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Stato</label><input className="form-input" value={editForm.state || ''} onChange={e => set('state', e.target.value)} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">CAP</label><input className="form-input" value={editForm.zip || ''} onChange={e => set('zip', e.target.value)} /></div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" checked={editForm.whatsappOptIn || false} onChange={e => set('whatsappOptIn', e.target.checked)} id="whatsapp" />
                    <label htmlFor="whatsapp" style={{ fontSize: 13 }}>WhatsApp Opt-in</label>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'hotel' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Hotel & Transfer</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Tipo camera</label><input className="form-input" value={editForm.roomType || ''} onChange={e => set('roomType', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">N. camere</label><input className="form-input" type="number" value={editForm.hotelRoomsNeeded || ''} onChange={e => set('hotelRoomsNeeded', e.target.value ? parseInt(e.target.value) : null)} /></div>
                  <div className="form-group"><label className="form-label">Upgrade</label><input className="form-input" value={editForm.hotelUpgrade || ''} onChange={e => set('hotelUpgrade', e.target.value)} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Check-in</label><input className="form-input" type="date" value={editForm.checkInDate ? editForm.checkInDate.substring(0, 10) : ''} onChange={e => set('checkInDate', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Check-out</label><input className="form-input" type="date" value={editForm.checkOutDate ? editForm.checkOutDate.substring(0, 10) : ''} onChange={e => set('checkOutDate', e.target.value)} /></div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" checked={editForm.noTransfer || false} onChange={e => set('noTransfer', e.target.checked)} id="noTransfer" />
                    <label htmlFor="noTransfer" style={{ fontSize: 13 }}>🚫 Non necessita di transfer</label>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'passport' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Passaporto</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Paese emissione</label><input className="form-input" value={editForm.passportCountry || ''} onChange={e => set('passportCountry', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Numero passaporto</label><input className="form-input" value={editForm.passportNumber || ''} onChange={e => set('passportNumber', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Scadenza</label><input className="form-input" value={editForm.passportExpiry || ''} onChange={e => set('passportExpiry', e.target.value)} placeholder="dd/mm/yyyy" /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Data di nascita</label><input className="form-input" value={editForm.dateOfBirth || ''} onChange={e => set('dateOfBirth', e.target.value)} placeholder="dd/mm/yyyy" /></div>
                </div>
              </>
            )}

            {activeSection === 'dietary' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Esigenze Alimentari & Mediche</div>
                <div className="form-group"><label className="form-label">Restrizioni alimentari</label><input className="form-input" value={editForm.dietaryRestrictions || ''} onChange={e => set('dietaryRestrictions', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Esigenze mobilità</label><input className="form-input" value={editForm.mobilityNeeds || ''} onChange={e => set('mobilityNeeds', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Info mediche</label><textarea className="form-textarea" value={editForm.medicalInfo || ''} onChange={e => set('medicalInfo', e.target.value)} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input type="checkbox" checked={editForm.healthAttestation || false} onChange={e => set('healthAttestation', e.target.checked)} id="health" />
                  <label htmlFor="health" style={{ fontSize: 13 }}>Health & Physical Self-Attestation</label>
                </div>
              </>
            )}

            {activeSection === 'contacts' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Contatto Emergenza</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={editForm.emergencyName || ''} onChange={e => set('emergencyName', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={editForm.emergencyPhone || ''} onChange={e => set('emergencyPhone', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.emergencyEmail || ''} onChange={e => set('emergencyEmail', e.target.value)} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Relazione</label><input className="form-input" value={editForm.emergencyRelation || ''} onChange={e => set('emergencyRelation', e.target.value)} /></div>
                </div>
                <div className="card-title" style={{ marginTop: 20, marginBottom: 12 }}>Assistente</div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={editForm.assistantName || ''} onChange={e => set('assistantName', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.assistantEmail || ''} onChange={e => set('assistantEmail', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={editForm.assistantPhone || ''} onChange={e => set('assistantPhone', e.target.value)} /></div>
                </div>
              </>
            )}

            {activeSection === 'meals' && (() => {
              const MEAL_SLOTS = [
                { key: '17giu_cena', label: '17 Giugno — Cena' },
                { key: '18giu_pranzo', label: '18 Giugno — Pranzo' },
                { key: '18giu_cena', label: '18 Giugno — Cena' },
                { key: '19giu_pranzo', label: '19 Giugno — Pranzo' },
                { key: '19giu_cena', label: '19 Giugno — Cena' },
                { key: '20giu_pranzo', label: '20 Giugno — Pranzo' },
                { key: '20giu_cena', label: '20 Giugno — Cena' },
              ];
              const ma = editForm.mealAttendance || {};
              const setMeal = (slotKey, val) => {
                const updated = { ...ma, [slotKey]: val };
                set('mealAttendance', updated);
              };
              const allChecked = MEAL_SLOTS.every(s => ma[s.key] !== false);
              const toggleAllMeals = () => {
                const newVal = !allChecked;
                const updated = {};
                MEAL_SLOTS.forEach(s => { updated[s.key] = newVal; });
                set('mealAttendance', updated);
              };
              return (
                <>
                  <div className="card-title" style={{ marginBottom: 12 }}>Partecipazione Pasti</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Deseleziona i pasti a cui l'ospite NON parteciperà. Di default tutti sono selezionati.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAllMeals} id="mealAll" />
                    <label htmlFor="mealAll" style={{ fontSize: 13, fontWeight: 600 }}>Tutti i pasti</label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {MEAL_SLOTS.map(s => (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={ma[s.key] !== false} onChange={e => setMeal(s.key, e.target.checked)} id={`meal_${s.key}`} />
                        <label htmlFor={`meal_${s.key}`} style={{ fontSize: 13 }}>{s.label}</label>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {activeSection === 'bio' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Bio & Note</div>
                <div className="form-group"><label className="form-label">Bio</label><textarea className="form-textarea" rows={3} value={editForm.bio || ''} onChange={e => set('bio', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Richieste speciali</label><textarea className="form-textarea" rows={3} value={editForm.specialRequests || ''} onChange={e => set('specialRequests', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Note</label><textarea className="form-textarea" rows={3} value={editForm.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
              </>
            )}

            {activeSection === 'consent' && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Privacy & Consensi</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['privacyConsent', 'Privacy - Trattamento dati personali'],
                    ['imageRightsConsent', 'Image Rights - Diritti immagine'],
                    ['cancellationConsent', 'Cancellation Policy - Politica di cancellazione'],
                    ['liabilityConsent', 'Assumption of Risk & Liability'],
                    ['insuranceConsent', 'Travel & Medical Insurance'],
                  ].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={editForm[key] || false} onChange={e => set(key, e.target.checked)} id={key} />
                      <label htmlFor={key} style={{ fontSize: 13 }}>{label}</label>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !editForm.firstName || !editForm.lastName}>
                {saving ? '⏳ Salvataggio...' : isNew ? '✅ Crea Ospite' : '💾 Salva Modifiche'}
              </button>
              {!isNew && <button className="btn" onClick={() => { setEditing(false); setEditForm(guest); }}>Annulla</button>}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* READ-ONLY VIEW */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
              <Field label="Email" value={guest.email} />
              <Field label="Cellulare" value={guest.phone} />
              <Field label="Tel. ufficio" value={guest.phoneOffice} />
              <Field label="Città" value={[guest.city, guest.state].filter(Boolean).join(', ')} />
              <Field label="Indirizzo" value={guest.mailingAddress} />
              <Field label="CAP" value={guest.zip} />
              <Field label="Data nascita" value={guest.dateOfBirth} />
              {guest.whatsappOptIn && <Field label="WhatsApp" value="Opt-in" />}
            </div>
          </div>

          {/* Hotel */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>🏨 Hotel</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
              <Field label="Camera" value={guest.roomType} />
              <Field label="N. camere" value={guest.hotelRoomsNeeded} />
              <Field label="Check-in" value={guest.checkInDate ? formatDate(guest.checkInDate) : null} />
              <Field label="Check-out" value={guest.checkOutDate ? formatDate(guest.checkOutDate) : null} />
              <Field label="Upgrade" value={guest.hotelUpgrade} />
              {guest.noTransfer && <div><span style={{ color: 'var(--danger)' }}>🚫 Non necessita di transfer</span></div>}
            </div>
          </div>

          {/* Meal attendance read-only */}
          {guest.mealAttendance && (() => {
            const MEAL_SLOTS = [
              { key: '17giu_cena', label: '17/06 Cena' },
              { key: '18giu_pranzo', label: '18/06 Pranzo' },
              { key: '18giu_cena', label: '18/06 Cena' },
              { key: '19giu_pranzo', label: '19/06 Pranzo' },
              { key: '19giu_cena', label: '19/06 Cena' },
              { key: '20giu_pranzo', label: '20/06 Pranzo' },
              { key: '20giu_cena', label: '20/06 Cena' },
            ];
            const ma = guest.mealAttendance;
            const skipped = MEAL_SLOTS.filter(s => ma[s.key] === false);
            if (skipped.length === 0) return null;
            return (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>🗓️ Pasti — Assenze</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {skipped.map(s => (
                    <span key={s.key} className="badge" style={{ background: '#fef2f2', color: 'var(--danger)' }}>✗ {s.label}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Passport */}
          {(guest.passportCountry || guest.passportNumber) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>🛂 Passaporto</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
                <Field label="Paese" value={guest.passportCountry} />
                <Field label="Numero" value={guest.passportNumber} />
                <Field label="Scadenza" value={guest.passportExpiry} />
                <Field label="Data nascita" value={guest.dateOfBirth} />
              </div>
            </div>
          )}

          {/* Diet & Medical */}
          {(guest.dietaryRestrictions || guest.mobilityNeeds || guest.medicalInfo) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>🍽️ Esigenze</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, fontSize: 14 }}>
                {guest.dietaryRestrictions && guest.dietaryRestrictions.toLowerCase() !== 'none' && (
                  <div><span style={{ color: 'var(--warning)' }}>Dieta:</span> <strong>{guest.dietaryRestrictions}</strong></div>
                )}
                {guest.mobilityNeeds && guest.mobilityNeeds.toLowerCase() !== 'none' && (
                  <div><span style={{ color: 'var(--danger)' }}>Mobilità:</span> <strong>{guest.mobilityNeeds}</strong></div>
                )}
                {guest.medicalInfo && guest.medicalInfo.toLowerCase() !== 'none' && (
                  <div><span style={{ color: 'var(--text-secondary)' }}>Info mediche:</span> {guest.medicalInfo}</div>
                )}
                {guest.healthAttestation && <div style={{ color: 'var(--success)', fontSize: 12 }}>✓ Health Self-Attestation</div>}
              </div>
            </div>
          )}

          {/* Emergency & Assistant */}
          {(guest.emergencyName || guest.assistantName) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
                {guest.emergencyName && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>📞 Contatto Emergenza</div>
                    <div>{guest.emergencyName} {guest.emergencyRelation ? `(${guest.emergencyRelation})` : ''}</div>
                    {guest.emergencyPhone && <div style={{ fontSize: 12 }}>Tel: {guest.emergencyPhone}</div>}
                    {guest.emergencyEmail && <div style={{ fontSize: 12 }}>Email: {guest.emergencyEmail}</div>}
                  </div>
                )}
                {guest.assistantName && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>👤 Assistente</div>
                    <div>{guest.assistantName}</div>
                    {guest.assistantPhone && <div style={{ fontSize: 12 }}>Tel: {guest.assistantPhone}</div>}
                    {guest.assistantEmail && <div style={{ fontSize: 12 }}>Email: {guest.assistantEmail}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bio & Requests */}
          {(guest.bio || guest.specialRequests || guest.notes) && (
            <div className="card" style={{ marginBottom: 16 }}>
              {guest.bio && <div style={{ marginBottom: 8, fontSize: 14 }}><span style={{ color: 'var(--text-secondary)' }}>Bio:</span> {guest.bio}</div>}
              {guest.specialRequests && <div style={{ marginBottom: 8, fontSize: 14 }}><span style={{ color: 'var(--warning)' }}>Richieste speciali:</span> {guest.specialRequests}</div>}
              {guest.notes && <div style={{ fontSize: 14 }}><span style={{ color: 'var(--text-secondary)' }}>Note:</span> {guest.notes}</div>}
            </div>
          )}

          {/* Consent badges */}
          {(guest.privacyConsent || guest.imageRightsConsent || guest.cancellationConsent || guest.liabilityConsent || guest.insuranceConsent) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>🔒 Consensi</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {guest.privacyConsent && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>✓ Privacy</span>}
                {guest.imageRightsConsent && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>✓ Image Rights</span>}
                {guest.cancellationConsent && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>✓ Cancellation</span>}
                {guest.liabilityConsent && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>✓ Liability</span>}
                {guest.insuranceConsent && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>✓ Insurance</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Companions */}
      {!isNew && (
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
      )}

      {/* Flights */}
      {!isNew && (
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
      )}

      {/* Modals */}
      {flightModal !== null && <FlightModal onClose={() => setFlightModal(null)} onSave={handleAddFlight} />}
      {compModal && <CompanionModal onClose={() => setCompModal(false)} onSave={handleAddCompanion} />}
    </div>
  );
}

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div><span style={{ color: 'var(--text-secondary)' }}>{label}:</span> <strong>{value}</strong></div>
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
