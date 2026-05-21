import React from 'react';
import './Skeleton.css';

const Skeleton = ({ 
  width = '100%', 
  height = '1rem', 
  variant = 'rectangular',
  animation = 'pulse',
  className = ''
}) => {
  const skeletonClass = `skeleton skeleton-${variant} skeleton-${animation} ${className}`.trim();
  
  const style = {
    width,
    height: variant === 'circular' ? width : height
  };

  return <div className={skeletonClass} style={style} />;
};

// Pre-built skeleton components for common use cases
const SkeletonText = ({ lines = 1, width = '100%' }) => {
  return (
    <div className="skeleton-text-container">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton 
          key={index}
          width={index === lines - 1 ? '75%' : width}
          height="1rem"
          className="skeleton-text-line"
        />
      ))}
    </div>
  );
};

const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <Skeleton variant="circular" width="40px" />
        <div className="skeleton-card-title">
          <Skeleton width="60%" height="1.2rem" />
          <Skeleton width="40%" height="0.9rem" />
        </div>
      </div>
      <div className="skeleton-card-body">
        <SkeletonText lines={3} />
      </div>
    </div>
  );
};

const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="skeleton-table">
      {/* Table header */}
      <div className="skeleton-table-row skeleton-table-header">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} height="1.5rem" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} height="1.2rem" />
          ))}
        </div>
      ))}
    </div>
  );
};

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable };