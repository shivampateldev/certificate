import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { templateAPI } from '../services/api';
import EmptyState from './EmptyState';
import { Button } from './Button';
import './TemplateSelector.css';

const TemplateSelector = ({ 
  selectedTemplateId, 
  onTemplateChange, 
  eventCategories = [],
  disabled = false 
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [eventCategories]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateAPI.getAllTemplates({ isActive: true });
      
      // Filter templates based on selected event categories
      let filteredTemplates = response.data.data;
      
      if (eventCategories.length > 0) {
        filteredTemplates = filteredTemplates.filter(template => 
          template.categories && template.categories.some(cat => eventCategories.includes(cat))
        );
      }
      
      setTemplates(filteredTemplates);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (disabled) return;
    
    const newSelection = selectedTemplateId === templateId ? null : templateId;
    onTemplateChange(newSelection);
  };

  if (loading) {
    return (
      <div className="template-selector">
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-selector">
        <div className="error">
          {error}
          <button onClick={fetchTemplates} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="template-selector">
        <EmptyState
          icon={eventCategories.length > 0 ? "🔍" : "📄"}
          title={eventCategories.length > 0 ? 'No Matching Templates' : 'No Templates Available'}
          description={
            eventCategories.length > 0 
              ? `No templates found for the selected categories: ${eventCategories.join(', ')}. You may need to create a template for these categories or select different categories.`
              : 'No templates are available for selection. Create your first template to get started with batch creation.'
          }
          action={
            <Button 
              variant="primary"
              onClick={() => window.location.href = '/templates'}
            >
              {eventCategories.length > 0 ? 'Create Template for Categories' : 'Create Your First Template'}
            </Button>
          }
          className="compact"
        />
      </div>
    );
  }

  return (
    <div className="template-selector">
      <div className="template-grid">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`template-card ${
              selectedTemplateId === template.id ? 'selected' : ''
            } ${disabled ? 'disabled' : ''}`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <div className="template-header">
              <input
                type="radio"
                name="template"
                checked={selectedTemplateId === template.id}
                onChange={() => handleTemplateSelect(template.id)}
                disabled={disabled}
                className="template-input"
              />
              <span className="template-name">{template.template_name || template.name || 'Unnamed Template'}</span>
            </div>
            
            {template.description && (
              <div className="template-description">
                {template.description}
              </div>
            )}
            
            <div className="template-categories">
              <strong>Categories:</strong>
              <div className="category-tags">
                {(template.categories || []).map((category) => (
                  <span 
                    key={category} 
                    className={`category-tag ${
                      eventCategories.includes(category) ? 'matching' : ''
                    }`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
            
            {(template.file_path || template.filePath) && (
              <div className="template-file">
                <small>File: {(template.file_path || template.filePath).split('/').pop()}</small>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedTemplateId && (
        <div className="selected-template">
          <strong>Selected Template:</strong> {
            templates.find(t => t.id === selectedTemplateId)?.template_name || 
            templates.find(t => t.id === selectedTemplateId)?.name || 
            'Unknown'
          }
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;