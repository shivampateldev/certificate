import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { LoadingSpinner, EmptyState, Button } from '../components';
import './EmailCampaigns.css';

const EmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    batchId: '',
    subject: '',
    bodyTemplate: '',
    scheduledAt: ''
  });

  useEffect(() => {
    fetchCampaigns();
    fetchBatches();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/emails/campaigns');
      // Handle the nested response structure
      const campaignsData = response.data?.data?.campaigns || response.data?.campaigns || [];
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load email campaigns');
      setCampaigns([]); // Ensure campaigns is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get('/certificates/batches');
      // Handle the nested response structure
      const batchesData = response.data?.data?.batches || response.data?.batches || [];
      setBatches(Array.isArray(batchesData) ? batchesData : []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]); // Ensure batches is always an array
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newCampaign.batchId) {
      toast.error('Please select a batch');
      return;
    }
    if (!newCampaign.subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!newCampaign.bodyTemplate.trim()) {
      toast.error('Please enter an email body template');
      return;
    }
    
    try {
      // Ensure batchId is a number
      const campaignData = {
        batchId: parseInt(newCampaign.batchId),
        subject: newCampaign.subject.trim(),
        bodyTemplate: newCampaign.bodyTemplate.trim(),
        scheduledAt: newCampaign.scheduledAt || null
      };
      
      console.log('Creating campaign with data:', campaignData);
      const response = await api.post('/emails/campaign', campaignData);
      console.log('Campaign creation response:', response);
      
      toast.success('Email campaign created successfully');
      setShowCreateForm(false);
      setNewCampaign({ batchId: '', subject: '', bodyTemplate: '', scheduledAt: '' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      
      // Better error handling
      let errorMessage = 'Failed to create email campaign';
      
      if (error.response?.data?.details) {
        // Validation errors
        const validationErrors = error.response.data.details.map(err => err.msg).join(', ');
        errorMessage = `Validation error: ${validationErrors}`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    try {
      await api.post(`/emails/send/${campaignId}`);
      toast.success('Email campaign started');
      fetchCampaigns();
      
      // Start monitoring progress
      monitorCampaignProgress(campaignId);
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to start email campaign');
    }
  };

  const monitorCampaignProgress = async (campaignId) => {
    setSelectedCampaign(campaignId);
    setShowProgress(true);
    
    const checkProgress = async () => {
      try {
        const response = await api.get(`/emails/campaign/${campaignId}/progress`);
        setCampaignProgress(response.data.progress);
        
        // Continue monitoring if campaign is still active
        if (response.data.progress.status === 'sending') {
          setTimeout(checkProgress, 2000); // Check every 2 seconds
        } else {
          // Campaign completed, refresh campaigns list
          fetchCampaigns();
        }
      } catch (error) {
        console.error('Error fetching campaign progress:', error);
      }
    };
    
    checkProgress();
  };

  const handleRetryFailed = async (campaignId) => {
    try {
      const response = await api.post(`/emails/campaign/${campaignId}/retry`);
      toast.success(`Retry completed: ${response.data.successCount} successful, ${response.data.failedCount} failed`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error retrying failed emails:', error);
      toast.error('Failed to retry failed emails');
    }
  };

  const handleViewDetails = async (campaignId) => {
    try {
      const response = await api.get(`/emails/campaign/${campaignId}/statistics-summary`);
      setSelectedCampaign(campaignId);
      setCampaignProgress(response.data.summary);
      setShowProgress(true);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast.error('Failed to load campaign details');
    }
  };

  if (loading) {
    return (
      <div className="email-campaigns">
        <div className="loading-container">
          <LoadingSpinner 
            size="large" 
            color="primary" 
            message="Loading email campaigns..." 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="email-campaigns">
      <div className="page-header-inline">
        <h1>📧 Email Campaigns</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Campaign
        </button>
      </div>

      {showCreateForm && (
        <div className="create-campaign-form">
          <h2>Create Email Campaign</h2>
          <form onSubmit={handleCreateCampaign}>
            <div className="form-group">
              <label className="form-label">Select Batch</label>
              {Array.isArray(batches) && batches.length > 0 ? (
                <select
                  className="form-control form-select"
                  value={newCampaign.batchId}
                  onChange={(e) => setNewCampaign({...newCampaign, batchId: e.target.value})}
                  required
                >
                  <option value="">Select a batch...</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} ({batch.total_participants || batch.totalParticipants} participants)
                    </option>
                  ))}
                </select>
              ) : (
                <EmptyState
                  icon="📋"
                  title="No Batches Available"
                  description="You need to create a batch of participants before you can create an email campaign. Go to the Participant Management page to upload participants and create your first batch."
                  action={
                    <Button 
                      variant="primary" 
                      onClick={() => window.location.href = '/participants'}
                    >
                      Go to Participant Management
                    </Button>
                  }
                  className="compact"
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email Subject</label>
              <input
                type="text"
                className="form-control"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                placeholder="Enter email subject..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Body Template</label>
              <textarea
                className="form-control"
                rows="6"
                value={newCampaign.bodyTemplate}
                onChange={(e) => setNewCampaign({...newCampaign, bodyTemplate: e.target.value})}
                placeholder="Enter email body template..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Schedule Time (Optional)</label>
              <input
                type="datetime-local"
                className="form-control"
                value={newCampaign.scheduledAt}
                onChange={(e) => setNewCampaign({...newCampaign, scheduledAt: e.target.value})}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Campaign
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="container">
        <h2>Email Campaigns</h2>
        {campaigns.length === 0 ? (
          <EmptyState
            icon="📧"
            title="No Email Campaigns Yet"
            description="Create your first email campaign to start sending personalized emails to your participants. You can track delivery status, manage recipients, and monitor campaign performance all from this dashboard."
            action={
              <Button 
                variant="primary" 
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Campaign
              </Button>
            }
          />
        ) : (
          <div className="campaigns-grid">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-header">
                  <h3>{campaign.subject}</h3>
                  <span className={`status-badge status-${campaign.status}`}>
                    {campaign.status}
                  </span>
                </div>
                
                <div className="campaign-stats">
                  <div className="stat">
                    <span className="stat-label">Recipients:</span>
                    <span className="stat-value">{campaign.total_recipients}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Sent:</span>
                    <span className="stat-value">{campaign.emails_sent}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Delivered:</span>
                    <span className="stat-value">{campaign.emails_delivered}</span>
                  </div>
                </div>

                <div className="campaign-actions">
                  {campaign.status === 'draft' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSendCampaign(campaign.id)}
                    >
                      Send Campaign
                    </button>
                  )}
                  {campaign.status === 'completed' && campaign.emails_failed > 0 && (
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={() => handleRetryFailed(campaign.id)}
                    >
                      Retry Failed ({campaign.emails_failed})
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewDetails(campaign.id)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {showProgress && campaignProgress && (
        <div className="modal-overlay" onClick={() => setShowProgress(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Campaign Progress</h3>
              <button 
                className="modal-close"
                onClick={() => setShowProgress(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="progress-section">
                <h4>Overall Progress</h4>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${campaignProgress.progressPercentage || 0}%` }}
                  ></div>
                </div>
                <p>{campaignProgress.progressPercentage || 0}% Complete</p>
                <p>
                  {campaignProgress.totalProcessed || 0} of {campaignProgress.totalRecipients || 0} processed
                </p>
              </div>

              {campaignProgress.deliveryStats ? (
                <div className="delivery-stats">
                  <h4>Delivery Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-item success">
                      <span className="stat-number">{campaignProgress.deliveryStats.sent || 0}</span>
                      <span className="stat-label">Sent</span>
                    </div>
                    <div className="stat-item delivered">
                      <span className="stat-number">{campaignProgress.deliveryStats.delivered || 0}</span>
                      <span className="stat-label">Delivered</span>
                    </div>
                    <div className="stat-item failed">
                      <span className="stat-number">{campaignProgress.deliveryStats.failed || 0}</span>
                      <span className="stat-label">Failed</span>
                    </div>
                    <div className="stat-item bounced">
                      <span className="stat-number">{campaignProgress.deliveryStats.bounced || 0}</span>
                      <span className="stat-label">Bounced</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon="📊"
                  title="No Delivery Statistics Yet"
                  description="Delivery statistics will appear here once the campaign starts sending emails. You'll be able to track sent, delivered, failed, and bounced emails in real-time."
                  className="compact"
                />
              )}

              <div className="campaign-info">
                <p><strong>Status:</strong> {campaignProgress.status || campaignProgress.campaignStatus}</p>
                {campaignProgress.startedAt && (
                  <p><strong>Started:</strong> {new Date(campaignProgress.startedAt).toLocaleString()}</p>
                )}
                {campaignProgress.completedAt && (
                  <p><strong>Completed:</strong> {new Date(campaignProgress.completedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;