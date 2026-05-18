import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function GuestLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.guestAuth(password);
      if (res.ok) {
        sessionStorage.setItem('guestToken', res.token);
        navigate('/guests');
      }
    } catch (err) {
      setError('Password errata');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-title" style={{ textAlign: 'center', marginBottom: 24 }}>🔒 Guest Management</div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20, fontSize: 14 }}>
          Questa sezione è protetta. Inserisci la password per accedere.
        </p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <div style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Accedi</button>
        </form>
      </div>
    </div>
  );
}
