import React from 'react';
import './FormValidation.css';

const FormError = ({ message, show = true, id }) => {
  if (!show || !message) return null;

  return (
    <div id={id} className="form-error" role="alert" aria-live="polite">
      <span className="error-icon" aria-hidden="true">⚠️</span>
      <span className="error-message">{message}</span>
    </div>
  );
};

const FormSuccess = ({ message, show = true, id }) => {
  if (!show || !message) return null;

  return (
    <div id={id} className="form-success" role="status" aria-live="polite">
      <span className="success-icon" aria-hidden="true">✅</span>
      <span className="success-message">{message}</span>
    </div>
  );
};

const FormWarning = ({ message, show = true, id }) => {
  if (!show || !message) return null;

  return (
    <div id={id} className="form-warning" role="alert" aria-live="polite">
      <span className="warning-icon" aria-hidden="true">⚠️</span>
      <span className="warning-message">{message}</span>
    </div>
  );
};

const FormInfo = ({ message, show = true, id }) => {
  if (!show || !message) return null;

  return (
    <div id={id} className="form-info" role="status" aria-live="polite">
      <span className="info-icon" aria-hidden="true">ℹ️</span>
      <span className="info-message">{message}</span>
    </div>
  );
};

// Input wrapper with validation (legacy - use Input component instead)
const ValidatedInput = ({ 
  label, 
  error, 
  success, 
  warning, 
  info, 
  required = false,
  children,
  className = '',
  ...props 
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      {children}
      <FormError message={error} />
      <FormSuccess message={success} />
      <FormWarning message={warning} />
      <FormInfo message={info} />
    </div>
  );
};

// Form validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

const validateMinLength = (value, minLength) => {
  return value && value.toString().length >= minLength;
};

const validateMaxLength = (value, maxLength) => {
  return !value || value.toString().length <= maxLength;
};

const validatePattern = (value, pattern) => {
  if (!value) return true;
  const regex = new RegExp(pattern);
  return regex.test(value);
};

// Form validation hook
const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validateField = (name, value) => {
    const rules = validationRules[name];
    if (!rules) return '';

    for (const rule of rules) {
      const { validator, message } = rule;
      if (!validator(value)) {
        return message;
      }
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};

export { 
  FormError, 
  FormSuccess, 
  FormWarning, 
  FormInfo, 
  ValidatedInput,
  validateEmail,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  useFormValidation
};