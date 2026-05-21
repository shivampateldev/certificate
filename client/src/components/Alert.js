import React, { useState } from 'react';
import './Alert.css';

const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  dismissible = false,
  onDismiss,
  icon = true,
  className = ''
}) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getIcon = () => {
    if (!icon) return null;
    
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const alertClass = `alert alert-${type} ${className}`.trim();

  return (
    <div className={alertClass} role="alert">
      <div className="alert-content">
        {icon && (
          <div className="alert-icon">
            {getIcon()}
          </div>
        )}
        
        <div className="alert-body">
          {title && <div className="alert-title">{title}</div>}
          <div className="alert-message">{children}</div>
        </div>
        
        {dismissible && (
          <button 
            className="alert-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// Specific alert types for common use cases
const SuccessAlert = (props) => <Alert type="success" {...props} />;
const ErrorAlert = (props) => <Alert type="error" {...props} />;
const WarningAlert = (props) => <Alert type="warning" {...props} />;
const InfoAlert = (props) => <Alert type="info" {...props} />;

export { Alert, SuccessAlert, ErrorAlert, WarningAlert, InfoAlert };