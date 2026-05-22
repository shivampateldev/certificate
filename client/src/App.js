import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';

// React Router v7 future flags for early adoption
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

import Home from './pages/Home';
import CertificateGenerator from './pages/CertificateGenerator';
import ParticipantManagement from './pages/ParticipantManagement';
import TemplateManagement from './pages/TemplateManagement';
import MassMailer from './pages/MassMailer';
import Reports from './pages/Reports';
import PerformanceTest from './pages/PerformanceTest';
import NotFound from './pages/NotFound';
import './App.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/participants', label: 'Participants', icon: '⧇' },
  { path: '/generate', label: 'Generate', icon: '⧁' },
  { path: '/templates', label: 'Templates', icon: '⧉' },
  { path: '/mass-mailer', label: 'Mass Mailer', icon: '⧄' },
  { path: '/reports', label: 'Reports', icon: '⧠' },
];

const pageTitles = {
  '/': 'Dashboard',
  '/participants': 'Participants',
  '/generate': 'Certificate Generator',
  '/templates': 'Template Management',
  '/mass-mailer': 'Mass Mailer',
  '/reports': 'Reports & Analytics',
};

function Sidebar({ open, onClose }) {
  const location = useLocation();
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="sidebar-logo" onClick={onClose}>
          <div className="sidebar-logo-icon">✦</div>
          <div>
            <div className="sidebar-logo-text">CertManager</div>
            <div className="sidebar-logo-sub">Certificate Platform</div>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <p>Platform v2.0</p>
            <Link to="/generate" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onClose}>
              Generate Now
            </Link>
          </div>
        </div>
      </aside>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />
    </>
  );
}

function Topbar({ onMenuClick }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
      </div>
      <div className="topbar-center">
        <img src="/header-banner.png" alt="Silver Oak University & IEEE Logos" className="header-logo-img" />
      </div>
      <div className="topbar-right"></div>
    </div>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="App">
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="app-body-container">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-wrapper">
          <main className="main-content" id="main-content" role="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/participants" element={<ParticipantManagement />} />
              <Route path="/generate" element={<CertificateGenerator />} />
              <Route path="/templates" element={<TemplateManagement />} />
              <Route path="/mass-mailer" element={<MassMailer />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/performance-test" element={<PerformanceTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
      <footer className="app-footer">
        <img src="/footer-banner.png" alt="Footer Banner" className="footer-banner-img" />
      </footer>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111827',
            color: 'white',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppLayout />
    </Router>
  );
}

export default App;
