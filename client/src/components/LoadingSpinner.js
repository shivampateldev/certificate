import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Loading...', 
  overlay = false,
  color = 'primary' 
}) => {
  const spinnerClass = `loading-spinner ${size} ${color} ${overlay ? 'overlay' : ''}`;

  return (
    <div className={spinnerClass}>
      <div className="spinner-circle"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;