import axios from 'axios';

// Vercel deployment configuration
// Force relative path '/api' if we are on Vercel (window.location.hostname contains 'vercel.app')
const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

const API_BASE = isVercel
  ? '/api'  // Relative path for Vercel Serverless Functions
  : process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:5000/api'; // Use 5000 for local dev Express backend

// Note: If running locally without proxy, typically server is 5000. 
// But Vercel dev uses 3000. Let's stick to relative if possible, or 5000 for explicit local backend.

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 120 seconds timeout for file uploads, OCR, and PDF mapping
});

// Certificate API
export const certificateAPI = {
  previewCertificate: (templateId, participantId) => 
    api.post('/certificates/preview', { template_id: templateId, participant_id: participantId }),
  
  generateCertificates: (templateId, participants, idPattern = '', generateIds = false) => 
    api.post('/certificates/generate', { template_id: templateId, participants, id_pattern: idPattern, generate_ids: generateIds }),
  
  getGeneration: (generationId) => api.get(`/certificates/generation/${generationId}`),
  getGenerationsByBatch: (batchId) => api.get(`/certificates/batch/${batchId}`),
  downloadCertificate: (certificateId) => api.get(`/certificates/download/${certificateId}`)
};

// Batch API -> Now mapped to Participant API mostly
export const batchAPI = {
  getAllBatches: (params = {}) => {
    // We don't have "Batches" yet, treating "Event Category" as a batch roughly?
    // Or just return Mock for now to prevent crash
    return Promise.resolve({ data: { data: { batches: [] } } });
  },
  
  createBatch: (participants, batchData) => {
    return api.post('/certificates/batch', { participants, batchData });
  }
};

// Participant API
export const participantAPI = {
  uploadParticipantFile: (file, batchName = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batchName', batchName);
    return api.post('/participants/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getAll: (params) => api.get('/participants', { params }),
  getById: (id) => api.get(`/participants/${id}`),
  create: (data) => api.post('/participants', data),
  update: (id, data) => api.put(`/participants/${id}`, data),
  delete: (id) => api.delete(`/participants/${id}`),
  getByBatchId: (batchId) => api.get(`/participants/batch/${batchId}`),
  createBatch: (batchName, eventName, eventDate, participants) => 
    api.post('/participants/batch', { batch_name: batchName, event_name: eventName, event_date: eventDate, participants }),
  exportCSV: (batchId) => api.post('/participants/export', { batch_id: batchId }, { responseType: 'blob' })
};

// Template API
export const templateAPI = {
  uploadTemplate: (file, templateName, width = 800, height = 600) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateName', templateName);
    formData.append('width', width);
    formData.append('height', height);
    return api.post('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getAllTemplates: (params = {}) => api.get('/templates', { params }),
  getActiveTemplates: () => api.get('/templates/active'),
  getTemplate: (templateId) => api.get(`/templates/${templateId}`),
  updateTemplate: (templateId, data) => api.put(`/templates/${templateId}`, data),
  deleteTemplate: (templateId) => api.delete(`/templates/${templateId}`),
  
  // Alias for backward compatibility - use uploadTemplate instead
  createTemplate: (file, templateName, width = 800, height = 600) => {
    if (file instanceof File) {
      return templateAPI.uploadTemplate(file, templateName, width, height);
    }
    // If called with object data, just return error
    return Promise.reject(new Error('Use uploadTemplate() for file uploads'));
  },
  
  // Template fields
  addField: (templateId, fieldData) => api.post(`/templates/${templateId}/fields`, fieldData),
  getFields: (templateId) => api.get(`/templates/${templateId}/fields`),
  saveMapping: (templateId, fields) => api.post('/templates/mapping', { template_id: templateId, fields }),
  updateField: (templateId, fieldId, fieldData) => api.put(`/templates/${templateId}/fields/${fieldId}`, fieldData),
  deleteField: (templateId, fieldId) => api.delete(`/templates/${templateId}/fields/${fieldId}`),

  getEventCategories: () => api.get('/certificates/event-categories')
};

// Mass Mailer API (legacy)
export const massMailAPI = {
  getAuthStatus: () => api.get('/mass-mail?action=status'),
  authenticateWithGoogle: () => {
    window.location.href = `${API_BASE}/mass-mail?action=auth`;
  },
  sendBulkEmails: (formData) => {
    return api.post('/mass-mail?action=send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minutes — Gmail OAuth2 sending can take time for bulk
    });
  },
  disconnect: () => api.post('/mass-mail?action=disconnect')
};

// Reports API
export const reportsAPI = {
  getDashboardStats: (params = {}) => {
    return api.get('/reports/dashboard', { params });
  },
  getGenerationStats: (params = {}) => {
    return api.get('/reports/generation', { params });
  },
  getEmailStats: (params = {}) => {
    return api.get('/reports/email', { params });
  }
};

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;