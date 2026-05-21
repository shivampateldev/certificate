import { useState, useEffect } from 'react';
import { templateAPI } from '../services/api';
import './EventCategorySelector.css';

const EventCategorySelector = ({ 
  selectedCategories = [], 
  onCategoriesChange, 
  multiple = true,
  disabled = false 
}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await templateAPI.getEventCategories();
      setCategories(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch event categories:', err);
      setError('Failed to load event categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryValue) => {
    if (disabled) return;

    let newSelection;
    
    if (multiple) {
      if (selectedCategories.includes(categoryValue)) {
        newSelection = selectedCategories.filter(cat => cat !== categoryValue);
      } else {
        newSelection = [...selectedCategories, categoryValue];
      }
    } else {
      newSelection = selectedCategories.includes(categoryValue) ? [] : [categoryValue];
    }
    
    onCategoriesChange(newSelection);
  };

  if (loading) {
    return (
      <div className="event-category-selector">
        <div className="loading">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-category-selector">
        <div className="error">
          {error}
          <button onClick={fetchCategories} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-category-selector">
      <div className="category-grid">
        {categories.map((category) => (
          <div
            key={category.value}
            className={`category-card ${
              selectedCategories.includes(category.value) ? 'selected' : ''
            } ${disabled ? 'disabled' : ''}`}
            onClick={() => handleCategoryChange(category.value)}
          >
            <div className="category-header">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                checked={selectedCategories.includes(category.value)}
                onChange={() => handleCategoryChange(category.value)}
                disabled={disabled}
                className="category-input"
              />
              <span className="category-label">{category.label || category.name}</span>
            </div>
            {category.description && (
              <div className="category-description">
                {category.description}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedCategories.length > 0 && (
        <div className="selected-summary">
          <strong>Selected:</strong> {selectedCategories.join(', ')}
        </div>
      )}
    </div>
  );
};

export default EventCategorySelector;