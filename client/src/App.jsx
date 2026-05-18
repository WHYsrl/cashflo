import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SupplierDetail from './pages/SupplierDetail.jsx';
import Scadenzario from './pages/Scadenzario.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import AIParser from './pages/AIParser.jsx';
import GuestLogin from './pages/GuestLogin.jsx';
import GuestList from './pages/GuestList.jsx';
import GuestDetail from './pages/GuestDetail.jsx';
import GuestImport from './pages/GuestImport.jsx';
import GuestMeetGreet from './pages/GuestMeetGreet.jsx';
import GuestTransport from './pages/GuestTransport.jsx';
import GuestInsights from './pages/GuestInsights.jsx';

function GuestNav() {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--border)', margin: '12px 16px', paddingTop: 12 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 6 }}>Guest Management</div>
      </div>
      <NavLink to="/guests" end className={({ isActive }) => isActive ? 'active' : ''}>
        👥 Ospiti
      </NavLink>
      <NavLink to="/guests/import" className={({ isActive }) => isActive ? 'active' : ''}>
        📥 Import Dati
      </NavLink>
      <NavLink to="/guests/meet-greet" className={({ isActive }) => isActive ? 'active' : ''}>
        🤝 Meet & Greet
      </NavLink>
      <NavLink to="/guests/transportation" className={({ isActive }) => isActive ? 'active' : ''}>
        🚐 Transportation
      </NavLink>
      <NavLink to="/guests/insights" className={({ isActive }) => isActive ? 'active' : ''}>
        🔍 AI Insights
      </NavLink>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const isGuestSection = location.pathname.startsWith('/guests');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          CashFlow
          <small>Event Management</small>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/suppliers" className={({ isActive }) => isActive ? 'active' : ''}>
            🏢 Fornitori
          </NavLink>
          <NavLink to="/scadenzario" className={({ isActive }) => isActive ? 'active' : ''}>
            📅 Scadenzario
          </NavLink>
          <NavLink to="/whatsapp" className={({ isActive }) => isActive ? 'active' : ''}>
            💬 WhatsApp
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => isActive ? 'active' : ''}>
            🤖 AI Import
          </NavLink>
          {isGuestSection ? <GuestNav /> : (
            <NavLink to="/guests" className={({ isActive }) => isActive ? 'active' : ''}>
              👥 Ospiti
            </NavLink>
          )}
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/scadenzario" element={<Scadenzario />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/ai" element={<AIParser />} />
          <Route path="/guests/login" element={<GuestLogin />} />
          <Route path="/guests/import" element={<GuestImport />} />
          <Route path="/guests/meet-greet" element={<GuestMeetGreet />} />
          <Route path="/guests/transportation" element={<GuestTransport />} />
          <Route path="/guests/insights" element={<GuestInsights />} />
          <Route path="/guests/:id" element={<GuestDetail />} />
          <Route path="/guests" element={<GuestList />} />
        </Routes>
      </main>
    </div>
  );
}
