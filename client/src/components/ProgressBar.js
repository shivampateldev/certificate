import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ 
  progress = 0, 
  showPercentage = true, 
  size = 'medium',
  color = 'primary',
  animated = false,
  label = ''
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const progressClass = `progress-bar ${size} ${color} ${animated ? 'animated' : ''}`;

  return (
    <div className="progress-container">
      {label && <div className="progress-label">{label}</div>}
      <div className={progressClass}>
        <div 
          className="progress-fill" 
          style={{ width: `${clampedProgress}%` }}
        >
          {showPercentage && (
            <span className="progress-text">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;