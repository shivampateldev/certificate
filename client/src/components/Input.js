import React, { useState, forwardRef } from 'react';
import { FormError, FormSuccess, FormWarning, FormInfo } from './FormValidation';
import './Input.css';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  success,
  warning,
  info,
  required = false,
  disabled = false,
  readOnly = false,
  size = 'medium',
  variant = 'default',
  icon,
  iconPosition = 'left',
  clearable = false,
  onClear,
  className = '',
  helpText,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Generate unique IDs for accessibility
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const helpTextId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const successId = success ? `${inputId}-success` : undefined;
  const warningId = warning ? `${inputId}-warning` : undefined;
  const infoId = info ? `${inputId}-info` : undefined;

  // Combine all describedby IDs
  const describedByIds = [
    ariaDescribedBy,
    helpTextId,
    errorId,
    successId,
    warningId,
    infoId
  ].filter(Boolean).join(' ') || undefined;

  const inputClass = `
    form-control 
    form-control-${size} 
    form-control-${variant}
    ${error ? 'error' : ''} 
    ${success ? 'success' : ''} 
    ${warning ? 'warning' : ''} 
    ${focused ? 'focused' : ''} 
    ${icon ? 'has-icon' : ''} 
    ${icon && iconPosition === 'right' ? 'has-icon-right' : ''} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const containerClass = `input-container ${disabled ? 'disabled' : ''}`;

  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={containerClass}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && <span className="required-asterisk" aria-label="required">*</span>}
        </label>
      )}
      
      <div className="input-wrapper">
        {icon && iconPosition === 'left' && (
          <span className="input-icon input-icon-left" aria-hidden="true">{icon}</span>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={ariaLabel}
          aria-describedby={describedByIds}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            className="input-action password-toggle"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            tabIndex={0}
          >
            <span aria-hidden="true">{showPassword ? '👁️' : '👁️‍🗨️'}</span>
          </button>
        )}
        
        {clearable && value && !disabled && !readOnly && (
          <button
            type="button"
            className="input-action clear-button"
            onClick={handleClear}
            aria-label="Clear input"
            tabIndex={0}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
        
        {icon && iconPosition === 'right' && (
          <span className="input-icon input-icon-right" aria-hidden="true">{icon}</span>
        )}
      </div>
      
      {helpText && !error && !success && !warning && !info && (
        <div id={helpTextId} className="input-help-text">{helpText}</div>
      )}
      
      <FormError message={error} id={errorId} />
      <FormSuccess message={success} id={successId} />
      <FormWarning message={warning} id={warningId} />
      <FormInfo message={info} id={infoId} />
    </div>
  );
});

Input.displayName = 'Input';

// Textarea component
const Textarea = forwardRef(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  success,
  warning,
  info,
  required = false,
  disabled = false,
  readOnly = false,
  rows = 4,
  resize = 'vertical',
  className = '',
  helpText,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const textareaClass = `
    form-control 
    form-textarea 
    ${error ? 'error' : ''} 
    ${success ? 'success' : ''} 
    ${warning ? 'warning' : ''} 
    ${focused ? 'focused' : ''} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const containerClass = `input-container ${disabled ? 'disabled' : ''}`;

  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={containerClass}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        className={textareaClass}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        rows={rows}
        style={{ resize }}
        {...props}
      />
      
      {helpText && !error && !success && !warning && !info && (
        <div className="input-help-text">{helpText}</div>
      )}
      
      <FormError message={error} />
      <FormSuccess message={success} />
      <FormWarning message={warning} />
      <FormInfo message={info} />
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select component
const Select = forwardRef(({
  label,
  options = [],
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  success,
  warning,
  info,
  required = false,
  disabled = false,
  placeholder = 'Select an option...',
  className = '',
  helpText,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const selectClass = `
    form-control 
    form-select 
    ${error ? 'error' : ''} 
    ${success ? 'success' : ''} 
    ${warning ? 'warning' : ''} 
    ${focused ? 'focused' : ''} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const containerClass = `input-container ${disabled ? 'disabled' : ''}`;

  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={containerClass}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        className={selectClass}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option 
            key={option.value || index} 
            value={option.value || option}
          >
            {option.label || option}
          </option>
        ))}
      </select>
      
      {helpText && !error && !success && !warning && !info && (
        <div className="input-help-text">{helpText}</div>
      )}
      
      <FormError message={error} />
      <FormSuccess message={success} />
      <FormWarning message={warning} />
      <FormInfo message={info} />
    </div>
  );
});

Select.displayName = 'Select';

export { Input, Textarea, Select };
export default Input;