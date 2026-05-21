import React from 'react';
import './Badge.css';

const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  rounded = false,
  removable = false,
  onRemove,
  className = ''
}) => {
  const badgeClass = `badge badge-${variant} badge-${size} ${rounded ? 'badge-rounded' : ''} ${className}`.trim();

  return (
    <span className={badgeClass}>
      <span className="badge-content">{children}</span>
      {removable && (
        <button 
          className="badge-remove"
          onClick={onRemove}
          aria-label="Remove badge"
        >
          ✕
        </button>
      )}
    </span>
  );
};

// Status Badge for common status indicators
const StatusBadge = ({ status, ...props }) => {
  const getVariantForStatus = (status) => {
    const statusMap = {
      'active': 'success',
      'inactive': 'secondary',
      'pending': 'warning',
      'completed': 'success',
      'failed': 'danger',
      'processing': 'info',
      'draft': 'secondary',
      'sent': 'info',
      'delivered': 'success',
      'bounced': 'warning',
      'error': 'danger'
    };
    return statusMap[status?.toLowerCase()] || 'secondary';
  };

  return (
    <Badge 
      variant={getVariantForStatus(status)} 
      {...props}
    >
      {status}
    </Badge>
  );
};

export { Badge, StatusBadge };