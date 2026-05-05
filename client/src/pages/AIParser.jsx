import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';

export default function AIParser() {
  const [mode, setMode] = useState('upload'); // upload | text
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [dragover, setDragover] = useState(false);
  const [aiModel, setAiModel] = useState('sonnet');
  const fileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { api.getSuppliers().then(setSuppliers); }, []);

  const handleParse = async () => {
    setError(null);
    setParsed(null);
    setParsing(true);
    try {
      let result;
      if (mode === 'upload' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', aiModel);
        result = await api.parseDocument(formData);
      } else if (mode === 'text' && text.trim()) {
        result = await api.parseText(text, aiModel);
      } else {
        setError('Fornisci un file o del testo da analizzare');
        setParsing(false);
        return;
      }
      if (result.error) setError(result.error);
      else setParsed(result.parsed);
    } catch (e) {
      setError(e.message);
    }
    setParsing(false);
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      // Check if supplier already exists
      const existing = suppliers.find(s =>
        s.alias?.toLowerCase() === parsed.supplierAlias?.toLowerCase() ||
        s.businessName?.toLowerCase() === parsed.businessName?.toLowerCase()
      );

      if (existing) {
        // Update existing supplier
        await api.updateSupplier(existing.id, {
          iban: parsed.iban || existing.iban,
          vatNumber: parsed.vatNumber || existing.vatNumber,
          businessName: parsed.businessName || existing.businessName
        });
        if (parsed.costs?.amountNet) {
          await api.addCost(existing.id, {
            amountNet: parsed.costs.amountNet,
            vatRate: parsed.costs.vatRate,
            vatAmount: parsed.costs.vatAmount,
            totalGross: parsed.costs.totalGross,
            notes: parsed.invoiceNumber ? `Rif. ${parsed.documentType || 'doc'} n. ${parsed.invoiceNumber}` : null
          });
        }
        if (parsed.payments?.length) {
          for (const pay of parsed.payments) {
            await api.createPayment({
              supplierId: existing.id,
              type: pay.type || 'ACCONTO',
              amount: pay.amount,
              dueDate: pay.dueDate || null,
              causale: pay.description || null,
              invoiceRef: parsed.invoiceNumber || null,
              status: 'PENDING'
            });
          }
        }
        navigate(`/suppliers/${existing.id}`);
      } else {
        // Create new supplier
        const supplierData = {
          alias: parsed.supplierAlias || parsed.businessName || 'Nuovo Fornitore',
          businessName: parsed.businessName,
          iban: parsed.iban,
          vatNumber: parsed.vatNumber,
          service: parsed.service,
          eventDate: parsed.eventDate,
          notes: parsed.notes,
          costs: parsed.costs?.amountNet ? [{
            amountNet: parsed.costs.amountNet,
            vatRate: parsed.costs.vatRate,
            vatAmount: parsed.costs.vatAmount,
            totalGross: parsed.costs.totalGross
          }] : [],
          payments: parsed.payments?.map(pay => ({
            type: pay.type || 'ACCONTO',
            amount: pay.amount,
            dueDate: pay.dueDate || null,
            causale: pay.description || null,
            invoiceRef: parsed.invoiceNumber || null,
            status: 'PENDING'
          })) || []
        };
        const result = await api.createSupplier(supplierData);
        navigate(`/suppliers/${result.id}`);
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const updateParsedField = (path, value) => {
    setParsed(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i].match(/^\d+$/)) obj = obj[parseInt(keys[i])];
        else obj = obj[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      const numVal = parseFloat(value);
      obj[lastKey] = !isNaN(numVal) && typeof obj[lastKey] === 'number' ? numVal : value;
      return next;
    });
  };

  return (
    <div>
      <h1 className="page-title">AI Import</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
        Carica una fattura/preventivo o incolla del testo — l'AI estrarrà automaticamente i dati del fornitore.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="view-tabs">
          <button className={`view-tab${mode === 'upload' ? ' active' : ''}`} onClick={() => setMode('upload')}>📄 Upload File</button>
          <button className={`view-tab${mode === 'text' ? ' active' : ''}`} onClick={() => setMode('text')}>✏️ Testo Libero</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Modello AI:</label>
          <select className="form-select" style={{ width: 'auto' }} value={aiModel} onChange={e => setAiModel(e.target.value)}>
            <option value="sonnet">Sonnet 4.6 (veloce)</option>
            <option value="opus">Opus 4.6 (massima precisione)</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {mode === 'upload' ? (
          <div
            className={`upload-zone${dragover ? ' dragover' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={e => { e.preventDefault(); setDragover(false); setFile(e.dataTransfer.files[0]); }}
          >
            <input ref={fileRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <div><strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)</div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                <div>Trascina qui un file PDF, immagine o testo</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>oppure clicca per selezionare</div>
              </div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Incolla testo della fattura o preventivo</label>
            <textarea className="form-textarea" style={{ minHeight: 160 }} value={text} onChange={e => setText(e.target.value)} placeholder="Incolla qui il testo del documento..." />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleParse} disabled={parsing || (mode === 'upload' ? !file : !text.trim())}>
            {parsing ? '⏳ Analisi in corso...' : '🤖 Analizza con AI'}
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ borderLeft: '4px solid var(--danger)', color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

      {parsed && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Dati estratti — verifica e correggi</div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : '💾 Salva nel Database'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Nome Fornitore</label>
              <input className="form-input" value={parsed.supplierAlias || ''} onChange={e => updateParsedField('supplierAlias', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Ragione Sociale</label>
              <input className="form-input" value={parsed.businessName || ''} onChange={e => updateParsedField('businessName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">P. IVA</label>
              <input className="form-input" value={parsed.vatNumber || ''} onChange={e => updateParsedField('vatNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">IBAN</label>
              <input className="form-input" value={parsed.iban || ''} onChange={e => updateParsedField('iban', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Servizio</label>
              <input className="form-input" value={parsed.service || ''} onChange={e => updateParsedField('service', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo Documento</label>
              <select className="form-select" value={parsed.documentType || ''} onChange={e => updateParsedField('documentType', e.target.value)}>
                <option value="">-</option>
                <option value="FATTURA">Fattura</option>
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CONTRATTO">Contratto</option>
                <option value="RICEVUTA">Ricevuta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">N. Documento</label>
              <input className="form-input" value={parsed.invoiceNumber || ''} onChange={e => updateParsedField('invoiceNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data Evento</label>
              <input className="form-input" type="date" value={parsed.eventDate || ''} onChange={e => updateParsedField('eventDate', e.target.value)} />
            </div>
          </div>

          {parsed.costs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Costi</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <div className="form-group">
                  <label className="form-label">Netto</label>
                  <input className="form-input" type="number" step="0.01" value={parsed.costs.amountNet || ''} onChange={e => updateParsedField('costs.amountNet', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">% IVA</label>
                  <input className="form-input" type="number" value={parsed.costs.vatRate || ''} onChange={e => updateParsedField('costs.vatRate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">IVA</label>
                  <input className="form-input" type="number" step="0.01" value={parsed.costs.vatAmount || ''} onChange={e => updateParsedField('costs.vatAmount', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Totale</label>
                  <input className="form-input" type="number" step="0.01" value={parsed.costs.totalGross || ''} onChange={e => updateParsedField('costs.totalGross', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {parsed.payments?.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Pagamenti</div>
              {parsed.payments.map((pay, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8, marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={pay.type || 'ACCONTO'} onChange={e => updateParsedField(`payments.${i}.type`, e.target.value)}>
                      <option value="ACCONTO">Acconto</option>
                      <option value="SALDO">Saldo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Importo</label>
                    <input className="form-input" type="number" step="0.01" value={pay.amount || ''} onChange={e => updateParsedField(`payments.${i}.amount`, e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scadenza</label>
                    <input className="form-input" type="date" value={pay.dueDate || ''} onChange={e => updateParsedField(`payments.${i}.dueDate`, e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descrizione</label>
                    <input className="form-input" value={pay.description || ''} onChange={e => updateParsedField(`payments.${i}.description`, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsed.notes && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Note</label>
              <textarea className="form-textarea" value={parsed.notes} onChange={e => updateParsedField('notes', e.target.value)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
