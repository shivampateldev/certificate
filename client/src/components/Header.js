import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/participants', label: 'Participants', icon: '👥' },
  { path: '/generate', label: 'Generate', icon: '📜' },
  { path: '/templates', label: 'Templates', icon: '🎨' },
  { path: '/mass-mailer', label: 'Mass Mailer', icon: '📧' },
  { path: '/reports', label: 'Reports', icon: '📊' },
];

const pageTitles = {
  '/': 'Dashboard',
  '/participants': 'Participants',
  '/generate': 'Certificate Generator',
  '/templates': 'Template Management',
  '/mass-mailer': 'Mass Mailer',
  '/reports': 'Reports & Analytics',
};

const Header = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const pageTitle = pageTitles[location.pathname] || 'Certificate Platform';

  return (
    <>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-logo-icon">🐐</div>
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
              aria-current={location.pathname === item.path ? 'page' : undefined}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <p>🚀 Platform v2.0</p>
            <Link to="/generate" className="btn btn-primary btn-sm w-full">
              Generate Now
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Top bar inside main-wrapper — rendered via App.js layout */}
      {/* We expose a global setter so App.js can wire the mobile button */}
      <div id="topbar-data" data-title={pageTitle} data-open={sidebarOpen} style={{ display: 'none' }} />
    </>
  );
};

export { pageTitles };
export default Header;
