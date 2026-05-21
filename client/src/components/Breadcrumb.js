import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  // Define route names and icons for better display
  const routeConfig = {
    '': { name: 'Home', icon: '🏠' },
    'participants': { name: 'Participants', icon: '👥' },
    'generate': { name: 'Generate Certificates', icon: '📜' },
    'templates': { name: 'Templates', icon: '🎨' },
    'mass-mailer': { name: 'Mass Mailer', icon: '📮' },
    'reports': { name: 'Reports', icon: '📊' }
  };

  // Don't show breadcrumb on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="breadcrumb" role="navigation" aria-label="Breadcrumb">
      <div className="breadcrumb-container">
        <Link 
          to="/" 
          className="breadcrumb-item"
          aria-label="Navigate to Home"
        >
          <span className="breadcrumb-icon" aria-hidden="true">🏠</span>
          <span className="breadcrumb-text">Home</span>
        </Link>
        {pathnames.map((pathname, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const config = routeConfig[pathname] || { name: pathname, icon: '📄' };

          return (
            <div key={pathname}>
              <span className="breadcrumb-separator" aria-hidden="true">›</span>
              {isLast ? (
                <span 
                  className="breadcrumb-item current"
                  aria-current="page"
                >
                  <span className="breadcrumb-icon" aria-hidden="true">{config.icon}</span>
                  <span className="breadcrumb-text">{config.name}</span>
                </span>
              ) : (
                <Link 
                  to={routeTo} 
                  className="breadcrumb-item"
                  aria-label={`Navigate to ${config.name}`}
                >
                  <span className="breadcrumb-icon" aria-hidden="true">{config.icon}</span>
                  <span className="breadcrumb-text">{config.name}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumb;