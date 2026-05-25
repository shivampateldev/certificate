/**
 * Database Models and Utilities
 * Provides CRUD operations for all collections
 */

const { db } = require('../utils/firebaseClient');

// ============================================================================
// PARTICIPANTS MODEL
// ============================================================================
const ParticipantModel = {
  async create(data) {
    const id = 'participant_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const participant = {
      id,
      name: data.name,
      email: data.email,
      certificate_id: data.certificate_id || `CERT-${Date.now()}`,
      batch_id: data.batch_id || null,
      custom_fields: data.custom_fields || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('participants').doc(id).set(participant);
    return participant;
  },

  async getById(id) {
    const doc = await db.collection('participants').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getByEmail(email) {
    const snapshot = await db.collection('participants').where('email', '==', email).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.length > 0 ? docs[0] : null;
  },

  async getByBatchId(batchId) {
    const snapshot = await db.collection('participants').where('batch_id', '==', batchId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async getAll() {
    const snapshot = await db.collection('participants').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const participant = await this.getById(id);
    if (!participant) throw new Error('Participant not found');
    
    const updated = {
      ...participant,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    await db.collection('participants').doc(id).set(updated);
    return updated;
  },

  async delete(id) {
    await db.collection('participants').doc(id).delete();
    return { success: true };
  },

  async bulkCreate(participants, batchId) {
    const created = [];
    for (const p of participants) {
      const participant = await this.create({
        ...p,
        batch_id: batchId
      });
      created.push(participant);
    }
    return created;
  }
};

// ============================================================================
// BATCHES MODEL
// ============================================================================
const BatchModel = {
  async create(data) {
    const id = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const batch = {
      id,
      batch_name: data.batch_name,
      participant_count: data.participant_count || 0,
      event_name: data.event_name || '',
      event_date: data.event_date || null,
      description: data.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('batches').doc(id).set(batch);
    return batch;
  },

  async getById(id) {
    const doc = await db.collection('batches').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getAll() {
    const snapshot = await db.collection('batches').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async update(id, data) {
    const batch = await this.getById(id);
    if (!batch) throw new Error('Batch not found');
    
    const updated = {
      ...batch,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    await db.collection('batches').doc(id).set(updated);
    return updated;
  },

  async delete(id) {
    await db.collection('batches').doc(id).delete();
    return { success: true };
  }
};

// ============================================================================
// TEMPLATES MODEL
// ============================================================================
const TemplateModel = {
  async create(data) {
    const id = 'template_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const template = {
      id,
      template_name: data.template_name,
      file_path: data.file_path,
      file_type: data.file_type, // 'png' or 'pdf'
      width: data.width || 800,
      height: data.height || 600,
      thumbnail_path: data.thumbnail_path || null,
      is_active: true,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('templates').doc(id).set(template);
    return template;
  },

  async getById(id) {
    const doc = await db.collection('templates').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getAll() {
    const snapshot = await db.collection('templates').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  },

  async getActive() {
    const snapshot = await db.collection('templates').where('is_active', '==', true).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const template = await this.getById(id);
    if (!template) throw new Error('Template not found');
    
    const updated = {
      ...template,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    await db.collection('templates').doc(id).set(updated);
    return updated;
  },

  async delete(id) {
    await db.collection('templates').doc(id).delete();
    return { success: true };
  }
};

// ============================================================================
// TEMPLATE FIELDS MODEL
// ============================================================================
const TemplateFieldModel = {
  async create(data) {
    const id = 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const field = {
      id,
      template_id: data.template_id,
      field_name: data.field_name, // e.g., 'name', 'email', 'certificate_id'
      field_type: data.field_type || 'text', // 'text', 'image', 'barcode'
      x: data.x || 0,
      y: data.y || 0,
      width: data.width || 200,
      height: data.height || 50,
      font_size: data.font_size || 24,
      font_family: data.font_family || 'Arial',
      font_weight: data.font_weight || 'normal',
      font_style: data.font_style || 'normal',
      letter_spacing: data.letter_spacing || 0,
      line_height: data.line_height || 0,
      color: data.color || '#000000',
      alignment: data.alignment || 'left',
      rotation: data.rotation || 0,
      created_at: new Date().toISOString()
    };
    
    await db.collection('template_fields').doc(id).set(field);
    return field;
  },

  async getByTemplateId(templateId) {
    const snapshot = await db.collection('template_fields').where('template_id', '==', templateId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const field = await db.collection('template_fields').doc(id).get();
    if (!field.exists) throw new Error('Field not found');
    
    const updated = {
      ...field.data(),
      ...data
    };
    
    await db.collection('template_fields').doc(id).set(updated);
    return updated;
  },

  async delete(id) {
    await db.collection('template_fields').doc(id).delete();
    return { success: true };
  },

  async deleteByTemplateId(templateId) {
    const fields = await this.getByTemplateId(templateId);
    for (const field of fields) {
      await this.delete(field.id);
    }
    return { success: true };
  }
};

// ============================================================================
// GENERATED CERTIFICATES MODEL
// ============================================================================
const GeneratedCertificateModel = {
  async create(data) {
    const id = 'cert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const cert = {
      id,
      generation_id: data.generation_id,
      participant_id: data.participant_id,
      template_id: data.template_id,
      file_path: data.file_path,
      file_name: data.file_name,
      status: 'generated', // 'generated', 'sent', 'failed'
      created_at: new Date().toISOString()
    };
    
    await db.collection('generated_certificates').doc(id).set(cert);
    return cert;
  },

  async getByGenerationId(generationId) {
    const snapshot = await db.collection('generated_certificates').where('generation_id', '==', generationId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async getByParticipantId(participantId) {
    const snapshot = await db.collection('generated_certificates').where('participant_id', '==', participantId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async getByCertificateId(certificateId) {
    const snapshot = await db.collection('generated_certificates').where('certificate_id', '==', certificateId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.length > 0 ? docs[0] : null;
  },

  async getAll() {
    const snapshot = await db.collection('generated_certificates').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  }
};

// ============================================================================
// CERTIFICATE GENERATIONS MODEL
// ============================================================================
const CertificateGenerationModel = {
  async create(data) {
    const id = 'generation_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const generation = {
      id,
      template_id: data.template_id,
      batch_id: data.batch_id,
      certificate_count: data.certificate_count || 0,
      status: 'pending', // 'pending', 'processing', 'completed', 'failed'
      error_message: null,
      generated_at: new Date().toISOString(),
      completed_at: null
    };
    
    await db.collection('certificate_generations').doc(id).set(generation);
    return generation;
  },

  async getById(id) {
    const doc = await db.collection('certificate_generations').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getByBatchId(batchId) {
    const snapshot = await db.collection('certificate_generations').where('batch_id', '==', batchId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const generation = await this.getById(id);
    if (!generation) throw new Error('Generation not found');
    
    const updated = {
      ...generation,
      ...data
    };
    
    await db.collection('certificate_generations').doc(id).set(updated);
    return updated;
  },

  async getAll() {
    const snapshot = await db.collection('certificate_generations').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
  }
};

// ============================================================================
// EMAIL CAMPAIGNS MODEL
// ============================================================================
const EmailCampaignModel = {
  async create(data) {
    const id = 'campaign_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const campaign = {
      id,
      batch_id: data.batch_id,
      generation_id: data.generation_id,
      subject: data.subject,
      body: data.body,
      sender_email: data.sender_email,
      recipient_count: data.recipient_count || 0,
      sent_count: 0,
      failed_count: 0,
      status: 'draft', // 'draft', 'sending', 'completed', 'failed'
      created_at: new Date().toISOString(),
      sent_at: null
    };
    
    await db.collection('email_campaigns').doc(id).set(campaign);
    return campaign;
  },

  async getById(id) {
    const doc = await db.collection('email_campaigns').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getByBatchId(batchId) {
    const snapshot = await db.collection('email_campaigns').where('batch_id', '==', batchId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const campaign = await this.getById(id);
    if (!campaign) throw new Error('Campaign not found');
    
    const updated = {
      ...campaign,
      ...data
    };
    
    await db.collection('email_campaigns').doc(id).set(updated);
    return updated;
  },

  async getAll() {
    const snapshot = await db.collection('email_campaigns').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

// ============================================================================
// EMAIL LOGS MODEL
// ============================================================================
const EmailLogModel = {
  async create(data) {
    const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const log = {
      id,
      campaign_id: data.campaign_id,
      participant_id: data.participant_id,
      recipient_email: data.recipient_email,
      status: data.status, // 'pending', 'sent', 'delivered', 'failed', 'bounced'
      provider_response: data.provider_response || null,
      error_message: data.error_message || null,
      created_at: new Date().toISOString(),
      sent_at: null,
      delivered_at: null
    };
    
    await db.collection('email_logs').doc(id).set(log);
    return log;
  },

  async getByCampaignId(campaignId) {
    const snapshot = await db.collection('email_logs').where('campaign_id', '==', campaignId).get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  },

  async update(id, data) {
    const log = await db.collection('email_logs').doc(id).get();
    if (!log.exists) throw new Error('Log not found');
    
    const updated = {
      ...log.data(),
      ...data
    };
    
    await db.collection('email_logs').doc(id).set(updated);
    return updated;
  },

  async getAll() {
    const snapshot = await db.collection('email_logs').get();
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

// ============================================================================
// SETTINGS MODEL
// ============================================================================
const SettingsModel = {
  async get(key) {
    const doc = await db.collection('settings').doc(key).get();
    return doc.exists ? doc.data() : null;
  },

  async set(key, value) {
    await db.collection('settings').doc(key).set({ key, value, updated_at: new Date().toISOString() });
    return { key, value };
  },

  async getAll() {
    const snapshot = await db.collection('settings').get();
    const settings = {};
    snapshot.forEach(doc => {
      settings[doc.id] = doc.data().value;
    });
    return settings;
  }
};

module.exports = {
  ParticipantModel,
  BatchModel,
  TemplateModel,
  TemplateFieldModel,
  GeneratedCertificateModel,
  CertificateGenerationModel,
  EmailCampaignModel,
  EmailLogModel,
  SettingsModel
};
