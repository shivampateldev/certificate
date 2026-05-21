import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  ...props
}) => {
  const buttonClass = `
    btn 
    btn-${variant} 
    btn-${size} 
    ${fullWidth ? 'btn-full-width' : ''} 
    ${loading ? 'btn-loading' : ''} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  // Generate accessible label for loading state
  const accessibleLabel = loading 
    ? `${ariaLabel || children} - Loading` 
    : ariaLabel;

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={accessibleLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <>
          <LoadingSpinner 
            size="small" 
            color="inherit" 
            message=""
            aria-hidden="true"
          />
          <span className="sr-only">Loading...</span>
        </>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left" aria-hidden="true">{icon}</span>
      )}
      
      {!loading && (
        <span className="btn-text">{children}</span>
      )}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right" aria-hidden="true">{icon}</span>
      )}
    </button>
  );
};

// Icon Button variant
const IconButton = ({
  icon,
  size = 'medium',
  variant = 'ghost',
  tooltip,
  'aria-label': ariaLabel,
  ...props
}) => {
  const iconButtonClass = `btn-icon-only btn-${size}`;
  
  // Icon buttons must have accessible labels
  const accessibleLabel = ariaLabel || tooltip || 'Button';
  
  return (
    <Button
      variant={variant}
      size={size}
      className={iconButtonClass}
      aria-label={accessibleLabel}
      title={tooltip}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
};

// Button Group component
const ButtonGroup = ({ 
  children, 
  size = 'medium',
  variant = 'primary',
  className = ''
}) => {
  const groupClass = `btn-group btn-group-${size} ${className}`.trim();
  
  return (
    <div className={groupClass}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            size: child.props.size || size,
            variant: child.props.variant || variant,
            className: `${child.props.className || ''} btn-group-item`.trim()
          });
        }
        return child;
      })}
    </div>
  );
};

export { Button, IconButton, ButtonGroup };
export default Button;