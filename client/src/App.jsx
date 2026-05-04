import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SupplierDetail from './pages/SupplierDetail.jsx';
import Scadenzario from './pages/Scadenzario.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import AIParser from './pages/AIParser.jsx';

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          CashFlow
          <small>Supplier Management</small>
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
        </Routes>
      </main>
    </div>
  );
}
