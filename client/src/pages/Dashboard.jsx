import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, statusLabel, statusColor } from '../utils/format.js';

function payLabel(p) {
  return p.label || (p.type === 'ACCONTO' ? 'Acconto' : 'Saldo');
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty">Errore caricamento dati</div>;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Fornitori</div>
          <div className="stat-value">{data.suppliersCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Costi Totali</div>
          <div className="stat-value">{formatCurrency(data.totalCosts)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pagato</div>
          <div className="stat-value success">{formatCurrency(data.totalPaid)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Da Pagare</div>
          <div className="stat-value danger">{formatCurrency(data.totalCosts - data.totalPaid)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>di cui programmati: {formatCurrency(data.totalDue)}</div>
        </div>
      </div>

      {data.overdueCount > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: 16 }}>
          <div className="card-title" style={{ color: 'var(--danger)' }}>
            ⚠️ {data.overdueCount} pagament{data.overdueCount === 1 ? 'o scaduto' : 'i scaduti'}
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Fornitore</th><th>Tranche</th><th>Importo</th><th>Scadenza</th></tr></thead>
              <tbody>
                {data.overduePayments.map(p => (
                  <tr key={p.id}>
                    <td><Link to={`/suppliers/${p.supplierId}`}>{p.supplier?.alias || p.supplier?.businessName}</Link></td>
                    <td>{payLabel(p)}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Prossime scadenze</div>
          <Link to="/scadenzario" className="btn btn-sm">Vedi tutto →</Link>
        </div>
        {data.upcomingPayments.length === 0 ? (
          <div className="empty">Nessuna scadenza imminente</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fornitore</th><th>Tranche</th><th>Importo</th><th>Scadenza</th><th>Stato</th></tr></thead>
              <tbody>
                {data.upcomingPayments.map(p => (
                  <tr key={p.id}>
                    <td><Link to={`/suppliers/${p.supplierId}`}>{p.supplier?.alias || p.supplier?.businessName}</Link></td>
                    <td>{payLabel(p)}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td><span className="badge" style={{ background: statusColor(p.status) + '22', color: statusColor(p.status) }}>{statusLabel(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
