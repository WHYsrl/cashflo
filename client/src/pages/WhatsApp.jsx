import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, statusLabel, statusColor, typeLabel } from '../utils/format.js';

export default function WhatsApp() {
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [waText, setWaText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getPayments({ status: '' }).then(data => {
      // Show only unpaid
      setPayments(data.filter(p => p.status !== 'PAID'));
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setWaText('');
  };

  const selectAll = () => {
    if (selected.size === payments.length) setSelected(new Set());
    else setSelected(new Set(payments.map(p => p.id)));
    setWaText('');
  };

  const generate = async () => {
    if (selected.size === 0) return;
    const result = await api.generateWhatsApp([...selected]);
    setWaText(result.text);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="page-title">Genera Testo WhatsApp</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
        Seleziona i pagamenti da comunicare all'amministrazione per i bonifici.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Pagamenti da effettuare</div>
          <div className="btn-group">
            <button className="btn btn-sm" onClick={selectAll}>
              {selected.size === payments.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
            <button className="btn btn-sm btn-primary" onClick={generate} disabled={selected.size === 0}>
              Genera Testo ({selected.size})
            </button>
          </div>
        </div>
        {payments.length === 0 ? (
          <div className="empty">Tutti i pagamenti sono stati effettuati!</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 40 }}></th><th>Fornitore</th><th>Rag. Sociale</th><th>IBAN</th><th>Tipo</th><th>Importo</th><th>Scadenza</th><th>Causale</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} onClick={() => toggle(p.id)} style={{ cursor: 'pointer', background: selected.has(p.id) ? 'rgba(37,99,235,.06)' : undefined }}>
                    <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td style={{ fontWeight: 600 }}>{p.supplier?.alias}</td>
                    <td>{p.supplier?.businessName || '-'}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{p.supplier?.iban || <span style={{ color: 'var(--danger)' }}>mancante</span>}</td>
                    <td>{typeLabel(p.type)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td style={{ fontSize: 12 }}>{p.causale || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {waText && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Testo per WhatsApp</div>
            <button className="btn btn-sm btn-success" onClick={copyToClipboard}>
              {copied ? '✓ Copiato!' : '📋 Copia'}
            </button>
          </div>
          <div className="wa-output">{waText}</div>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            Formato: Ragione Sociale / IBAN / Importo / Causale — pronto da incollare su WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}
