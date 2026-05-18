import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function GuestInsights() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('guestToken');
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (!token) navigate('/guests/login'); }, [token]);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getGuestInsights(token);
      setInsights(result.insights);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Simple markdown-like rendering
  const renderInsights = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h2 key={i} style={{ marginTop: 16, marginBottom: 8 }}>{line.slice(2)}</h2>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ marginTop: 12, marginBottom: 6, color: 'var(--primary)' }}>{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} style={{ marginTop: 8, marginBottom: 4 }}>{line.slice(4)}</h4>;
      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 600, marginTop: 12 }}>{line.slice(2, -2)}</div>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 16, marginBottom: 2 }}>• {line.slice(2)}</div>;
      if (line.startsWith('───') || line.startsWith('═══')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />;
      if (line.trim() === '') return <br key={i} />;
      // Bold inline
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} style={{ marginBottom: 2 }} />;
    });
  };

  return (
    <div>
      <h1 className="page-title">AI Insights & Alerts</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
        Analisi intelligente dei dati ospiti: arrivi, esigenze speciali, alert per fornitori (hotel, ristoranti, trasporti, meet & greet).
      </p>

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={generateInsights} disabled={loading}>
          {loading ? '⏳ Analisi AI in corso...' : '🔍 Genera Insights & Alerts'}
        </button>
      </div>

      {error && <div className="card" style={{ borderLeft: '4px solid var(--danger)', color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}

      {insights && (
        <div className="card" style={{ lineHeight: 1.6, fontSize: 14 }}>
          {renderInsights(insights)}
        </div>
      )}
    </div>
  );
}
