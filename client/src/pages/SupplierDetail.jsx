import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, statusLabel, statusColor } from '../utils/format.js';

function PaymentModal({ supplierId, payment, onClose, onSave }) {
  const [form, setForm] = useState(payment || {
    supplierId, type: 'ACCONTO', label: '', amount: '', dueDate: '', paidDate: '', causale: '', invoiceRef: '', notes: '', status: 'PENDING'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    // Se lo stato è PAID e non c'è data pagamento, metti oggi
    if (data.status === 'PAID' && !data.paidDate) data.paidDate = new Date().toISOString();
    if (payment?.id) await api.updatePayment(payment.id, data);
    else await api.createPayment(data);
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{payment?.id ? 'Modifica Pagamento' : 'Nuovo Pagamento'}</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="ACCONTO">Acconto</option>
              <option value="SALDO">Saldo</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Etichetta tranche</label>
            <input className="form-input" value={form.label || ''} onChange={e => set('label', e.target.value)} placeholder="es. Acconto 1, Tranche 2, Saldo finale" />
          </div>
          <div className="form-group">
            <label className="form-label">Importo *</label>
            <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Scadenza pagamento</label>
            <input className="form-input" type="date" value={form.dueDate ? form.dueDate.substring(0, 10) : ''} onChange={e => set('dueDate', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Stato</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="PENDING">Da pagare</option>
              <option value="SCHEDULED">Programmato</option>
              <option value="PAID">Pagato</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data pagamento effettivo</label>
            <input className="form-input" type="date" value={form.paidDate ? form.paidDate.substring(0, 10) : ''} onChange={e => set('paidDate', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Rif. Fattura/Preventivo</label>
          <input className="form-input" value={form.invoiceRef || ''} onChange={e => set('invoiceRef', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Causale (per bonifico)</label>
          <input className="form-input" value={form.causale || ''} onChange={e => set('causale', e.target.value)} placeholder="es. acconto evento del 19/06/26 villa sospisio" />
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={handleSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

function CostModal({ supplierId, onClose, onSave }) {
  const [form, setForm] = useState({ amountNet: '', vatRate: '', vatAmount: '', totalGross: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    await api.addCost(supplierId, {
      amountNet: parseFloat(form.amountNet) || 0,
      vatRate: parseFloat(form.vatRate) || null,
      vatAmount: parseFloat(form.vatAmount) || null,
      totalGross: parseFloat(form.totalGross) || null,
      notes: form.notes || null
    });
    onSave();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Aggiungi Costo</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Importo Netto *</label>
            <input className="form-input" type="number" step="0.01" value={form.amountNet} onChange={e => set('amountNet', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">% IVA</label>
            <input className="form-input" type="number" value={form.vatRate} onChange={e => set('vatRate', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Importo IVA</label>
            <input className="form-input" type="number" step="0.01" value={form.vatAmount} onChange={e => set('vatAmount', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Totale Lordo</label>
            <input className="form-input" type="number" step="0.01" value={form.totalGross} onChange={e => set('totalGross', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={handleSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(null);
  const [costModal, setCostModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const load = useCallback(() => {
    api.getSupplier(id).then(s => { setSupplier(s); setEditForm(s); }).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirm('Eliminare questo fornitore e tutti i dati associati?')) return;
    await api.deleteSupplier(id);
    navigate('/suppliers');
  };

  const handleSaveEdit = async () => {
    await api.updateSupplier(id, editForm);
    setEditing(false);
    load();
  };

  const handleMarkPaid = async (paymentId) => {
    await api.updatePayment(paymentId, { status: 'PAID', paidDate: new Date().toISOString() });
    load();
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Eliminare questo pagamento?')) return;
    await api.deletePayment(paymentId);
    load();
  };

  const handleDeleteCost = async (costId) => {
    if (!confirm('Eliminare questo costo?')) return;
    await api.deleteCost(id, costId);
    load();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!supplier) return <div className="empty">Fornitore non trovato</div>;

  const totalCost = supplier.costs.reduce((a, c) => a + (c.totalGross || c.amountNet || 0), 0);
  const totalPaid = supplier.payments.filter(p => p.status === 'PAID').reduce((a, p) => a + p.amount, 0);
  const totalDue = supplier.payments.filter(p => p.status !== 'PAID').reduce((a, p) => a + p.amount, 0);

  // Etichetta pagamento: usa label custom oppure fallback a tipo
  const payLabel = (p) => p.label || (p.type === 'ACCONTO' ? 'Acconto' : 'Saldo');

  return (
    <div>
      <button className="btn btn-sm" onClick={() => navigate('/suppliers')} style={{ marginBottom: 16 }}>← Fornitori</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{supplier.alias}</h1>
          {supplier.businessName && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{supplier.businessName}</div>}
        </div>
        <div className="btn-group">
          <button className="btn btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Annulla' : '✏️ Modifica'}</button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑 Elimina</button>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={editForm.alias || ''} onChange={e => setEditForm(f => ({ ...f, alias: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Ragione Sociale</label><input className="form-input" value={editForm.businessName || ''} onChange={e => setEditForm(f => ({ ...f, businessName: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">IBAN</label><input className="form-input" value={editForm.iban || ''} onChange={e => setEditForm(f => ({ ...f, iban: e.target.value }))} /></div>
          <div className="form-row-3">
            <div className="form-group"><label className="form-label">P. IVA</label><input className="form-input" value={editForm.vatNumber || ''} onChange={e => setEditForm(f => ({ ...f, vatNumber: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Referente/i</label><input className="form-input" value={editForm.contactPerson || ''} onChange={e => setEditForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Telefono fisso</label><input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Cellulare</label><input className="form-input" value={editForm.mobile || ''} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Sintesi servizio</label><input className="form-input" value={editForm.serviceSummary || ''} onChange={e => setEditForm(f => ({ ...f, serviceSummary: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descrizione estesa servizio</label><textarea className="form-textarea" value={editForm.serviceDescription || ''} onChange={e => setEditForm(f => ({ ...f, serviceDescription: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Note</label><textarea className="form-textarea" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Salva Modifiche</button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 14 }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>IBAN:</span> <strong>{supplier.iban || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Servizio:</span> <strong>{supplier.serviceSummary || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>P. IVA:</span> <strong>{supplier.vatNumber || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{supplier.email || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Referente/i:</span> <strong>{supplier.contactPerson || '-'}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Tel:</span> <strong>{[supplier.phone, supplier.mobile].filter(Boolean).join(' / ') || '-'}</strong></div>
            {supplier.serviceDescription && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Dettaglio servizio:</span> {supplier.serviceDescription}</div>}
            {supplier.notes && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Note:</span> {supplier.notes}</div>}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Costo Totale</div><div className="stat-value">{formatCurrency(totalCost)}</div></div>
        <div className="stat-card"><div className="stat-label">Pagato</div><div className="stat-value success">{formatCurrency(totalPaid)}</div></div>
        <div className="stat-card"><div className="stat-label">Da Pagare</div><div className="stat-value danger">{formatCurrency(totalDue)}</div></div>
      </div>

      {/* Costs section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Costi</div>
          <button className="btn btn-sm btn-primary" onClick={() => setCostModal(true)}>+ Costo</button>
        </div>
        {supplier.costs.length === 0 ? <div className="empty">Nessun costo registrato</div> : (
          <table>
            <thead><tr><th>Netto</th><th>% IVA</th><th>IVA</th><th>Totale</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {supplier.costs.map(c => (
                <tr key={c.id}>
                  <td>{formatCurrency(c.amountNet)}</td>
                  <td>{c.vatRate ? c.vatRate + '%' : '-'}</td>
                  <td>{formatCurrency(c.vatAmount)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalGross)}</td>
                  <td>{c.notes || '-'}</td>
                  <td><button className="btn btn-sm" onClick={() => handleDeleteCost(c.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payments section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Scadenze e Pagamenti</div>
          <button className="btn btn-sm btn-primary" onClick={() => setPaymentModal({})}>+ Pagamento</button>
        </div>
        {supplier.payments.length === 0 ? (
          <div className="empty">Nessun pagamento registrato — aggiungi acconti, tranches e saldo</div>
        ) : (
          <table>
            <thead><tr><th>Tranche</th><th>Importo</th><th>Scadenza</th><th>Pagato il</th><th>Stato</th><th>Causale</th><th>Rif.</th><th></th></tr></thead>
            <tbody>
              {supplier.payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{payLabel(p)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                  <td>{formatDate(p.dueDate)}</td>
                  <td>{p.status === 'PAID' ? formatDate(p.paidDate) : '-'}</td>
                  <td><span className="badge" style={{ background: statusColor(p.status) + '22', color: statusColor(p.status) }}>{statusLabel(p.status)}</span></td>
                  <td style={{ fontSize: 12 }}>{p.causale || '-'}</td>
                  <td style={{ fontSize: 12 }}>{p.invoiceRef || '-'}</td>
                  <td>
                    <div className="btn-group">
                      {p.status !== 'PAID' && <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(p.id)}>✓ Pagato</button>}
                      <button className="btn btn-sm" onClick={() => setPaymentModal(p)}>✏️</button>
                      <button className="btn btn-sm" onClick={() => handleDeletePayment(p.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paymentModal !== null && <PaymentModal supplierId={id} payment={paymentModal.id ? paymentModal : undefined} onClose={() => setPaymentModal(null)} onSave={() => { setPaymentModal(null); load(); }} />}
      {costModal && <CostModal supplierId={id} onClose={() => setCostModal(false)} onSave={() => { setCostModal(false); load(); }} />}
    </div>
  );
}
