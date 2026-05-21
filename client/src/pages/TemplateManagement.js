import React, { useState, useEffect } from 'react';
import { templateAPI } from '../services/api';
import TemplateSelector from '../components/TemplateSelector';
import EventCategorySelector from '../components/EventCategorySelector';
import TemplateUploader from '../components/TemplateUploader';
import { LoadingSpinner, EmptyState, Button } from '../components';
import './TemplateManagement.css';

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [filterCategories, setFilterCategories] = useState([]);

  useEffect(() => {
    fetchTemplates();
  }, [filterCategories]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategories.length > 0) {
        params.category = filterCategories[0];
      }
      
      const response = await templateAPI.getAllTemplates(params);
      setTemplates(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateUploaded = () => {
    setShowUploader(false);
    fetchTemplates();
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      await templateAPI.deleteTemplate(templateId);
      await fetchTemplates();
      setError(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  if (showUploader) {
    return (
      <div className="template-management">
        <TemplateUploader 
          onTemplateUploaded={handleTemplateUploaded}
          onCancel={() => setShowUploader(false)}
        />
      </div>
    );
  }

  return (
    <div className="template-management">
      <div className="page-header-inline">
        <h1>Template Management</h1>
        <button 
          onClick={() => setShowUploader(true)}
          className="create-btn"
          disabled={loading}
        >
          📤 Upload Template
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="dismiss-btn">×</button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Categories:</label>
          <EventCategorySelector
            selectedCategories={filterCategories}
            onCategoriesChange={setFilterCategories}
            multiple={true}
          />
          {filterCategories.length > 0 && (
            <button 
              onClick={() => setFilterCategories([])}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="templates-section">
        <h2>Available Templates ({templates.length})</h2>
        
        {loading ? (
          <LoadingSpinner 
            size="medium" 
            color="primary" 
            message="Loading templates..." 
          />
        ) : templates.length === 0 ? (
          <EmptyState
            icon="📄"
            title={filterCategories.length > 0 ? 'No Templates Found' : 'No Templates Available'}
            description={
              filterCategories.length > 0 
                ? `No templates found for selected categories: ${filterCategories.join(', ')}. Try adjusting your filters or upload a new template for these categories.`
                : 'Get started by uploading your first certificate template (PNG, JPG, or PDF). Templates help you standardize your certificates across different event categories.'
            }
            action={
              filterCategories.length === 0 ? (
                <Button 
                  variant="primary"
                  onClick={() => setShowUploader(true)}
                >
                  Upload Your First Template
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  onClick={() => setFilterCategories([])}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <h3>{template.template_name}</h3>
                  <div className="template-actions">
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="delete-btn"
                      title="Delete template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="template-file">
                  <strong>File Type:</strong> {template.file_type.toUpperCase()}
                </div>

                <div className="template-dimensions">
                  <strong>Dimensions:</strong> {template.width} × {template.height}px
                </div>

                <div className="template-meta">
                  <span className="created-date">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="template-selector-demo">
        <h2>Template Selection Preview</h2>
        <p>This shows how templates will appear in the certificate generation process:</p>
        <TemplateSelector
          selectedTemplateId={null}
          onTemplateChange={() => {}}
          eventCategories={filterCategories}
          disabled={false}
        />
      </div>
    </div>
  );
};

export default TemplateManagement;