import React from 'react';
import './EmptyState.css';

const EmptyState = ({
  icon = '⊞',
  title = 'No data available',
  description = 'There are no items to display at the moment.',
  action = null,
  className = '',
  ...props
}) => {
  return (
    <div className={`empty-state ${className}`} {...props}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;