import { useState, useEffect } from 'react';
import { templateAPI } from '../services/api';
import EventCategorySelector from './EventCategorySelector';
import EmptyState from './EmptyState';
import { Button } from './Button';
import './TemplateManager.css';

const TemplateManager = ({ 
  onTemplateCreated, 
  onTemplateUpdated, 
  onTemplateDeleted,
  showCreateButton = true,
  compact = false 
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [filterCategories, setFilterCategories] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [],
    filePath: '',
    templateData: null,
    isActive: true
  });

  useEffect(() => {
    fetchTemplates();
  }, [filterCategories]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = { isActive: true };
      
      // Apply category filter if selected
      if (filterCategories.length > 0) {
        params.category = filterCategories[0]; // API supports single category filter
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categories: [],
      filePath: '',
      templateData: null,
      isActive: true
    });
    setEditingTemplate(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }
    
    if (formData.categories.length === 0) {
      setError('At least one category is required');
      return;
    }

    try {
      setLoading(true);
      
      if (editingTemplate) {
        // Update existing template
        const response = await templateAPI.updateTemplate(editingTemplate.id, formData);
        if (onTemplateUpdated) {
          onTemplateUpdated(response.data.data);
        }
      } else {
        // Create new template
        const response = await templateAPI.createTemplate(formData);
        if (onTemplateCreated) {
          onTemplateCreated(response.data.data);
        }
      }
      
      resetForm();
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err.response?.data?.error?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      categories: template.categories || [],
      filePath: template.filePath || '',
      templateData: template.templateData,
      isActive: template.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      await templateAPI.deleteTemplate(templateId);
      
      if (onTemplateDeleted) {
        onTemplateDeleted(templateId);
      }
      
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (template) => {
    try {
      setLoading(true);
      const updateData = { isActive: !template.isActive };
      await templateAPI.updateTemplate(template.id, updateData);
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to toggle template status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update template status');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => (
    <div className="template-form-container">
      <div className="form-header">
        <h3>{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
        <button type="button" onClick={resetForm} className="close-btn">
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="template-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="templateName">Template Name *</label>
            <input
              id="templateName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter template name"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="templateDescription">Description</label>
            <textarea
              id="templateDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter template description"
              rows="3"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Event Categories *</label>
            <EventCategorySelector
              selectedCategories={formData.categories}
              onCategoriesChange={(categories) => setFormData({ ...formData, categories })}
              multiple={true}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="templateFilePath">File Path</label>
            <input
              id="templateFilePath"
              type="text"
              value={formData.filePath}
              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
              placeholder="Enter template file path (optional)"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={loading}
              />
              Active Template
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={resetForm} className="cancel-btn" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
          </button>
        </div>
      </form>
    </div>
  );

  const renderTemplateCard = (template) => (
    <div key={template.id} className={`template-card ${!template.isActive ? 'inactive' : ''}`}>
      <div className="template-header">
        <h4>{template.name}</h4>
        <div className="template-actions">
          <button
            onClick={() => handleToggleActive(template)}
            className={`toggle-btn ${template.isActive ? 'active' : 'inactive'}`}
            title={template.isActive ? 'Deactivate template' : 'Activate template'}
            disabled={loading}
          >
            {template.isActive ? '👁️' : '👁️‍🗨️'}
          </button>
          <button
            onClick={() => handleEdit(template)}
            className="edit-btn"
            title="Edit template"
            disabled={loading}
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(template.id)}
            className="delete-btn"
            title="Delete template"
            disabled={loading}
          >
            🗑️
          </button>
        </div>
      </div>

      {template.description && (
        <p className="template-description">{template.description}</p>
      )}

      <div className="template-categories">
        <strong>Categories:</strong>
        <div className="category-tags">
          {template.categories.map((category) => (
            <span key={category} className="category-tag">
              {category}
            </span>
          ))}
        </div>
      </div>

      {template.filePath && (
        <div className="template-file">
          <strong>File:</strong> {template.filePath.split('/').pop()}
        </div>
      )}

      <div className="template-meta">
        <span className={`status ${template.isActive ? 'active' : 'inactive'}`}>
          {template.isActive ? 'Active' : 'Inactive'}
        </span>
        <span className="created-date">
          {new Date(template.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`template-manager ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="manager-header">
          <div className="header-content">
            <h2>Template Management</h2>
            {showCreateButton && (
              <button
                onClick={() => setShowForm(true)}
                className="create-btn"
                disabled={loading}
              >
                Create Template
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="dismiss-btn">×</button>
            </div>
          )}

          <div className="filters">
            <div className="filter-group">
              <label>Filter by Categories:</label>
              <EventCategorySelector
                selectedCategories={filterCategories}
                onCategoriesChange={setFilterCategories}
                multiple={true}
                disabled={loading}
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
        </div>
      )}

      {compact && error && (
        <div className="error-message compact">
          {error}
          <button onClick={() => setError(null)} className="dismiss-btn">×</button>
        </div>
      )}

      <div className="templates-content">
        {loading && templates.length === 0 ? (
          <div className="loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={filterCategories.length > 0 ? "🔍" : "📄"}
            title={filterCategories.length > 0 ? 'No Templates Found' : 'No Templates Available'}
            description={
              filterCategories.length > 0
                ? `No templates found for selected categories: ${filterCategories.join(', ')}. Try adjusting your filters or create a new template for these categories.`
                : 'No templates available. Create your first template to get started with standardized email campaigns and certificates.'
            }
            action={
              filterCategories.length === 0 && showCreateButton ? (
                <Button 
                  variant="primary"
                  onClick={() => setShowForm(true)}
                >
                  Create Your First Template
                </Button>
              ) : filterCategories.length > 0 ? (
                <Button 
                  variant="secondary"
                  onClick={() => setFilterCategories([])}
                >
                  Clear Filters
                </Button>
              ) : null
            }
            className={compact ? "compact" : ""}
          />
        ) : (
          <div className={`templates-grid ${compact ? 'compact' : ''}`}>
            {templates.map(renderTemplateCard)}
          </div>
        )}
      </div>

      {showForm && renderForm()}
    </div>
  );
};

export default TemplateManager;