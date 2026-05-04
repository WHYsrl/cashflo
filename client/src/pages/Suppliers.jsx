import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, statusColor, statusLabel } from '../utils/format.js';

function SupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState(supplier || {
    alias: '', businessName: '', iban: '', vatNumber: '', email: '', phone: '', service: '', notes: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const navigate = useNavigate();

  const handleSave = async () => {
    if (supplier?.id) {
      await api.updateSupplier(supplier.id, form);
      onSaved();
    } else {
      const created = await api.createSupplier(form);
      onClose();
      navigate(`/suppliers/${created.id}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{supplier?.id ? 'Modifica Fornitore' : 'Nuovo Fornitore — Dati Anagrafici'}</div>
        {!supplier?.id && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Dopo il salvataggio potrai aggiungere costi, scadenze e pagamenti dalla scheda del fornitore.
          </p>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome breve *</label>
            <input className="form-input" value={form.alias} onChange={e => set('alias', e.target.value)} placeholder="es. VILLA SOSPISIO" />
          </div>
          <div className="form-group">
            <label className="form-label">Ragione Sociale</label>
            <input className="form-input" value={form.businessName || ''} onChange={e => set('businessName', e.target.value)} placeholder="es. MIRO' SRL" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">IBAN</label>
          <input className="form-input" value={form.iban || ''} onChange={e => set('iban', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">P. IVA</label>
            <input className="form-input" value={form.vatNumber || ''} onChange={e => set('vatNumber', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Servizio</label>
          <input className="form-input" value={form.service || ''} onChange={e => set('service', e.target.value)} placeholder="es. LOCATION DINNER 19.06" />
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.alias}>
            {supplier?.id ? 'Salva' : 'Salva e vai alla scheda →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = () => api.getSuppliers().then(setSuppliers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = suppliers.filter(s =>
    (s.alias + ' ' + (s.businessName || '') + ' ' + (s.service || '')).toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid = (s) => s.payments.filter(p => p.status === 'PAID').reduce((a, p) => a + p.amount, 0);
  const totalDue = (s) => s.payments.filter(p => p.status !== 'PAID').reduce((a, p) => a + p.amount, 0);
  const totalCost = (s) => s.costs.reduce((a, c) => a + (c.totalGross || c.amountNet || 0), 0);

  // Prossima scadenza non pagata
  const nextDue = (s) => {
    const pending = s.payments.filter(p => p.status !== 'PAID' && p.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return pending[0]?.dueDate || null;
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Fornitori</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Nuovo Fornitore</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Cerca fornitore..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>
      {filtered.length === 0 ? (
        <div className="empty">Nessun fornitore trovato</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fornitore</th><th>Ragione Sociale</th><th>Servizio</th><th>Pross. Scadenza</th><th>Costo</th><th>Pagato</th><th>Da Pagare</th><th>Stato</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const due = totalDue(s);
                  const hasOverdue = s.payments.some(p => p.status === 'OVERDUE');
                  const nd = nextDue(s);
                  return (
                    <tr key={s.id} className="clickable-row" onClick={() => navigate(`/suppliers/${s.id}`)}>
                      <td style={{ fontWeight: 600 }}>{s.alias}</td>
                      <td>{s.businessName || '-'}</td>
                      <td>{s.service || '-'}</td>
                      <td>{nd ? formatDate(nd) : '-'}</td>
                      <td>{formatCurrency(totalCost(s))}</td>
                      <td style={{ color: 'var(--success)' }}>{formatCurrency(totalPaid(s))}</td>
                      <td style={{ color: due > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{formatCurrency(due)}</td>
                      <td>
                        {hasOverdue && <span className="badge" style={{ background: '#fef2f2', color: 'var(--danger)' }}>Scaduto</span>}
                        {!hasOverdue && due > 0 && <span className="badge" style={{ background: '#fefce8', color: 'var(--warning)' }}>In corso</span>}
                        {due === 0 && totalPaid(s) > 0 && <span className="badge" style={{ background: '#ecfdf5', color: 'var(--success)' }}>Saldato</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modal !== null && <SupplierModal supplier={modal.id ? modal : undefined} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
