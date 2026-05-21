import React from 'react';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  image,
  actions,
  variant = 'default',
  size = 'medium',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardClass = `
    card 
    card-${variant} 
    card-${size} 
    ${hoverable ? 'card-hoverable' : ''} 
    ${clickable ? 'card-clickable' : ''} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  return (
    <div 
      className={cardClass} 
      onClick={handleClick}
      {...props}
    >
      {image && (
        <div className="card-image">
          {typeof image === 'string' ? (
            <img src={image} alt={title || 'Card image'} />
          ) : (
            image
          )}
        </div>
      )}
      
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="card-body">
        {children}
      </div>
      
      {actions && (
        <div className="card-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

// Specialized card variants
const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  color = 'primary',
  ...props 
}) => {
  return (
    <Card 
      variant="stats" 
      className={`stats-card-${color}`}
      {...props}
    >
      <div className="stats-card-content">
        <div className="stats-info">
          <div className="stats-title">{title}</div>
          <div className="stats-value">{value}</div>
          {change && (
            <div className={`stats-change stats-change-${changeType}`}>
              {change}
            </div>
          )}
        </div>
        {icon && (
          <div className="stats-icon">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  unit, 
  trend, 
  trendDirection = 'up',
  color = 'primary',
  ...props 
}) => {
  return (
    <Card 
      variant="metric" 
      className={`metric-card-${color}`}
      {...props}
    >
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">
          {value}
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        {trend && (
          <div className={`metric-trend metric-trend-${trendDirection}`}>
            <span className="trend-icon">
              {trendDirection === 'up' ? '↗️' : trendDirection === 'down' ? '↘️' : '➡️'}
            </span>
            {trend}
          </div>
        )}
      </div>
    </Card>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  action,
  ...props 
}) => {
  return (
    <Card 
      variant="feature" 
      hoverable 
      {...props}
    >
      <div className="feature-content">
        {icon && (
          <div className="feature-icon">
            {icon}
          </div>
        )}
        <div className="feature-info">
          <h4 className="feature-title">{title}</h4>
          <p className="feature-description">{description}</p>
        </div>
        {action && (
          <div className="feature-action">
            {action}
          </div>
        )}
      </div>
    </Card>
  );
};

export { Card, StatsCard, MetricCard, FeatureCard };
export default Card;