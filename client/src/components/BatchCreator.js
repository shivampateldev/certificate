import { useState } from 'react';
import EventCategorySelector from './EventCategorySelector';
import TemplateSelector from './TemplateSelector';
import { batchAPI } from '../services/api';
import './BatchCreator.css';

const BatchCreator = ({ 
  participants = [], 
  onBatchCreated, 
  onCancel,
  initialBatchName = '' 
}) => {
  const [batchName, setBatchName] = useState(initialBatchName || `Batch-${new Date().toISOString().slice(0, 10)}`);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Categories, 2: Template, 3: Review

  const handleNext = () => {
    if (step === 1 && selectedCategories.length === 0) {
      setError('Please select at least one event category');
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one event category');
      return;
    }

    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const batchData = {
        name: batchName.trim(),
        eventCategories: selectedCategories,
        templateId: selectedTemplateId
      };

      console.log('Creating batch with data:', { participants, batchData });
      const response = await batchAPI.createBatch(participants, batchData);
      console.log('Batch creation response:', response);
      
      if (onBatchCreated) {
        onBatchCreated(response.data.data.batch);
      }
    } catch (err) {
      console.error('Failed to create batch:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to create batch';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <h3>Select Event Categories</h3>
            <p>Choose one or more categories that best describe your event:</p>
            <EventCategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              multiple={true}
              disabled={loading}
            />
          </div>
        );
      
      case 2:
        return (
          <div className="step-content">
            <h3>Select Certificate Template</h3>
            <p>Choose a template that matches your selected categories:</p>
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={setSelectedTemplateId}
              eventCategories={selectedCategories}
              disabled={loading}
            />
          </div>
        );
      
      case 3:
        return (
          <div className="step-content">
            <h3>Review and Create Batch</h3>
            <div className="review-section">
              <div className="review-item">
                <label>Batch Name:</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  disabled={loading}
                  className="batch-name-input"
                  placeholder="Enter batch name"
                />
              </div>
              
              <div className="review-item">
                <label>Event Categories:</label>
                <div className="review-value">
                  {selectedCategories.join(', ')}
                </div>
              </div>
              
              <div className="review-item">
                <label>Template:</label>
                <div className="review-value">
                  {selectedTemplateId ? 'Template selected' : 'No template selected'}
                </div>
              </div>
              
              <div className="review-item">
                <label>Participants:</label>
                <div className="review-value">
                  {participants.length} participants
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="batch-creator">
      <div className="batch-creator-header">
        <h2>Create New Batch</h2>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="batch-creator-content">
        {renderStepContent()}
      </div>

      <div className="batch-creator-actions">
        <button
          onClick={onCancel}
          disabled={loading}
          className="cancel-btn"
        >
          Cancel
        </button>
        
        {step > 1 && (
          <button
            onClick={handleBack}
            disabled={loading}
            className="back-btn"
          >
            Back
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={loading}
            className="next-btn"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleCreateBatch}
            disabled={loading || !batchName.trim()}
            className="create-btn"
          >
            {loading ? 'Creating...' : 'Create Batch'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchCreator;