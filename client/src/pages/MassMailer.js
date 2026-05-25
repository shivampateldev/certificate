import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import { massMailAPI, templateAPI } from '../services/api';
import './MassMailerClean.css';
import './MassMailerMaterial.css';

const MassMailer = () => {
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [subject, setSubject] = useState('Your Certificate');
  const [bodyTemplate, setBodyTemplate] = useState('Dear {Name},\n\nPlease find attached your certificate.\n\nBest regards,\nThe Team');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Customization States
  const [campaignType, setCampaignType] = useState('certificate'); // 'certificate' or 'reminder'
  const [headerType, setHeaderType] = useState('none'); // 'none', 'promptwars', 'logos', 'custom'
  const [colorTheme, setColorTheme] = useState('purple'); // 'purple', 'emerald', 'blue', 'red', 'amber', 'custom'
  const [customColor, setCustomColor] = useState('#4f46e5');
  const [backgroundType, setBackgroundType] = useState('light'); // 'light' or 'dark'
  const [headerTitle, setHeaderTitle] = useState('In-person PromptWars');
  const [headerSubtitle, setHeaderSubtitle] = useState('Build, pitch & win in one day');
  const [headerBadge, setHeaderBadge] = useState('Google for Developers | H2S');
  const [headerImage, setHeaderImage] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await templateAPI.getActiveTemplates();
      if (response.data && response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load active templates:', err);
    }
  };

  const checkAuthStatus = () => {
    const token = localStorage.getItem('gmail_access_token');
    const email = localStorage.getItem('gmail_user_email');
    const authTime = localStorage.getItem('gmail_auth_time');
    
    if (token && email) {
      if (token === 'demo_token') {
        setIsAuthenticated(true);
      } else if (authTime && (Date.now() - parseInt(authTime)) < 50 * 60 * 1000) {
        setIsAuthenticated(true);
      } else {
        // Clear expired credentials
        localStorage.removeItem('gmail_access_token');
        localStorage.removeItem('gmail_user_email');
        localStorage.removeItem('gmail_display_name');
        localStorage.removeItem('gmail_auth_time');
        setIsAuthenticated(false);
        toast.error('Gmail session expired. Please sign in again to refresh credentials.');
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add standard Gmail Send scope so backend can send on user's behalf
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      toast.loading('Opening Google Sign-In...', { id: 'auth-loading' });
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;

      if (!token) {
        throw new Error('Access token not granted. Please make sure to allow permissions.');
      }

      localStorage.setItem('gmail_access_token', token);
      localStorage.setItem('gmail_user_email', user.email);
      localStorage.setItem('gmail_display_name', user.displayName || '');
      localStorage.setItem('gmail_auth_time', Date.now().toString());

      setIsAuthenticated(true);
      toast.success(`Successfully authenticated as ${user.email}`, { id: 'auth-loading' });
    } catch (error) {
      console.error('Google Auth login error:', error);
      toast.error(`Authentication failed: ${error.message}`, { id: 'auth-loading' });
    }
  };

  const handleDemoMode = () => {
    localStorage.setItem('gmail_access_token', 'demo_token');
    localStorage.setItem('gmail_user_email', 'demo@ificatemanagement.com');
    localStorage.setItem('gmail_display_name', 'Demo Administrator');
    setIsAuthenticated(true);
    toast.success('Demo mode enabled - authentication bypassed');
  };

  const handleSendEmails = async (e) => {
    e.preventDefault();

    if (campaignType === 'certificate' && !selectedTemplateId && !zipFile) {
      toast.error('Please select a template OR upload a certificate ZIP file');
      return;
    }

    if (!csvFile) {
      toast.error('Please select a recipient CSV/Excel file');
      return;
    }

    if (!subject.trim() || !bodyTemplate.trim()) {
      toast.error('Please enter subject and email body');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('campaignType', campaignType);
      formData.append('headerType', headerType);
      formData.append('colorTheme', colorTheme === 'custom' ? customColor : colorTheme);
      formData.append('backgroundType', backgroundType);

      if (headerType === 'promptwars') {
        formData.append('headerTitle', headerTitle);
        formData.append('headerSubtitle', headerSubtitle);
        formData.append('headerBadge', headerBadge);
      }

      if (headerType === 'custom' && headerImage) {
        formData.append('headerImage', headerImage);
      }

      if (campaignType === 'certificate') {
        if (zipFile) {
          formData.append('zipfile', zipFile);
        }
        if (selectedTemplateId) {
          formData.append('templateId', selectedTemplateId);
        }
      }
      
      formData.append('csvfile', csvFile);
      formData.append('subject', subject);
      formData.append('body', bodyTemplate);
      formData.append('senderDisplayName', senderDisplayName);
      
      // Pass client-side captured Google Access Token and Sender Email
      const token = localStorage.getItem('gmail_access_token') || 'demo_token';
      const senderEmail = localStorage.getItem('gmail_user_email') || 'demo@ificatemanagement.com';
      formData.append('accessToken', token);
      formData.append('senderEmail', senderEmail);

      toast.loading('Sending emails...', { id: 'sending' });

      // Use centralized API
      const response = await massMailAPI.sendBulkEmails(formData);

      if (response.data.success) {
        toast.success('Emails sent successfully!', { id: 'sending' });

        // Reset form
        setZipFile(null);
        setCsvFile(null);
        setSelectedTemplateId('');
        setSenderDisplayName('');

        setResults(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to send emails', { id: 'sending' });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      const msg = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message
        || 'Failed to send emails. Please try again.';
      toast.error(msg, { id: 'sending' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mass-mailer">
      <div className="container">
        <header className="header-section">
          <h1>Mass Email Sender</h1>
          <p className="subtitle">Send certificates to multiple recipients via Gmail</p>
        </header>

        {!isAuthenticated ? (
          <section className="auth-section" aria-labelledby="auth-title">
            <div className="md-card md-card-elevated">
              <div className="md-card-content text-center">
                <h2 id="auth-title" className="md-card-title">
                  Gmail Authentication Required
                </h2>
                <p className="md-card-subtitle mb-8">Connect your Gmail account to send mass emails</p>
                <div className="space-y-4">
                  <button
                    className="btn btn-primary btn-lg md-button-raised"
                    onClick={handleGoogleAuth}
                    aria-describedby="google-auth-desc"
                  >
                    Sign in with Google
                  </button>
                  <p id="google-auth-desc" className="sr-only">
                    This will redirect you to Google's authentication page to authorize Gmail access
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={handleDemoMode}
                    aria-describedby="demo-mode-desc"
                  >
                    Demo Mode (Skip Auth)
                  </button>
                  <p id="demo-mode-desc" className="sr-only">
                    Skip authentication for testing purposes - emails will not actually be sent
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="email-form" aria-labelledby="email-form-title">
            <div className="md-card mb-8" role="status" aria-live="polite">
              <div className="md-card-content flex justify-between items-center">
                <div className="auth-success">
                  <span className="text-success font-semibold text-lg">
                    Gmail Connected: {localStorage.getItem('gmail_user_email')}
                  </span>
                  <p className="text-secondary mt-2">Emails will be sent directly on behalf of this Google account.</p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    localStorage.removeItem('gmail_access_token');
                    localStorage.removeItem('gmail_user_email');
                    localStorage.removeItem('gmail_display_name');
                    setIsAuthenticated(false);
                    toast.success('Successfully disconnected from Gmail');
                  }}
                  aria-describedby="disconnect-desc"
                >
                  Disconnect
                </button>
                <span id="disconnect-desc" className="sr-only">
                  Disconnect from Gmail and return to authentication screen
                </span>
              </div>
            </div>

            <form onSubmit={handleSendEmails} className="md-card md-card-content" aria-labelledby="email-form-title">
              <h2 id="email-form-title" className="sr-only">Mass Email Configuration Form</h2>

              {/* Campaign Type Selector */}
              <div className="form-group mb-6" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label className="form-label font-semibold" style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Campaign Mode
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: campaignType === 'certificate' ? 'var(--primary)' : '#fff',
                      color: campaignType === 'certificate' ? '#fff' : 'var(--text-primary)',
                      border: '1.5px solid',
                      borderColor: campaignType === 'certificate' ? 'var(--primary)' : '#cbd5e1',
                      transition: 'all 0.2s ease',
                      boxShadow: campaignType === 'certificate' ? 'var(--shadow-md)' : 'none'
                    }}
                    onClick={() => setCampaignType('certificate')}
                  >
                    🎓 Certificate Delivery Campaign
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: campaignType === 'reminder' ? 'var(--primary)' : '#fff',
                      color: campaignType === 'reminder' ? '#fff' : 'var(--text-primary)',
                      border: '1.5px solid',
                      borderColor: campaignType === 'reminder' ? 'var(--primary)' : '#cbd5e1',
                      transition: 'all 0.2s ease',
                      boxShadow: campaignType === 'reminder' ? 'var(--shadow-md)' : 'none'
                    }}
                    onClick={() => setCampaignType('reminder')}
                  >
                    🔔 Pure Announcement / Reminder Campaign
                  </button>
                </div>
              </div>

              {campaignType === 'certificate' && (
                <>
                  {/* Certificate template selector */}
                  <div className="form-group mb-6" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="template-select" className="form-label font-semibold" style={{ fontWeight: '600' }}>
                      Certificate Template Selection (Optional - Dynamically draw placeholders)
                    </label>
                    <select
                      id="template-select"
                      className="form-control"
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        if (e.target.value) {
                          setZipFile(null); // Clear zip selection if template mode is used
                        }
                      }}
                      aria-describedby="template-select-help"
                    >
                      <option value="">-- Mode A: Send pre-generated PDFs from ZIP file --</option>
                      {templates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>
                          Mode B: Generate dynamically using Template: {tpl.template_name} ({tpl.file_type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <div id="template-select-help" className="input-help-text mt-1 text-sm text-secondary" style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#666' }}>
                      Choose a saved certificate template to automatically generate personalized certificates on the fly. Selecting a template disables and makes the "Certificate ZIP File" upload optional!
                    </div>
                  </div>
                </>
              )}

              <fieldset className="file-uploads grid grid-2">
                <legend className="sr-only">File Upload Section</legend>

                {campaignType === 'certificate' ? (
                  <div className="form-group">
                    <label htmlFor="zip-file" className={`form-label ${selectedTemplateId ? 'text-muted' : ''}`} style={{ opacity: selectedTemplateId ? 0.5 : 1 }}>
                      Certificate ZIP File {selectedTemplateId ? '(Bypassed by Template)' : ''}
                    </label>
                    <input
                      id="zip-file"
                      type="file"
                      accept=".zip"
                      onChange={(e) => setZipFile(e.target.files[0])}
                      required={!selectedTemplateId}
                      disabled={!!selectedTemplateId}
                      className="form-control"
                      aria-describedby="zip-file-help"
                      style={{ opacity: selectedTemplateId ? 0.6 : 1 }}
                    />
                    <div id="zip-file-help" className="sr-only">
                      Upload a ZIP file containing all certificate PDFs to be sent via email
                    </div>
                    {zipFile && (
                      <div className="file-success" role="status" aria-live="polite">
                        ✓ {zipFile.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group" style={{ opacity: 0.5 }}>
                    <label className="form-label text-muted">
                      🎓 Certificate Attachments Bypassed
                    </label>
                    <div className="form-control" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                      Reminder mode: No certificates required or attached.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="csv-file" className="form-label">
                    Recipient CSV / Excel File
                  </label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    required
                    className="form-control"
                    aria-describedby="csv-file-help"
                  />
                  <div id="csv-file-help" className="sr-only">
                    Upload a CSV or Excel file containing recipient information including names and email addresses
                  </div>
                  {csvFile && (
                    <div className="file-success" role="status" aria-live="polite">
                      ✓ {csvFile.name}
                    </div>
                  )}
                </div>
              </fieldset>

              {/* ✨ EMAIL HEADER & THEME DESIGN CUSTOMIZER ✨ */}
              <div className="theme-customizer-section" style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎨 Email Header & Theme Customize
                </h3>
                
                <div className="grid grid-2" style={{ gap: '20px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="header-type" className="form-label" style={{ fontWeight: '600' }}>Header Style / Banner</label>
                    <select id="header-type" className="form-control" value={headerType} onChange={(e) => setHeaderType(e.target.value)}>
                      <option value="none">None (Plain Styled Email)</option>
                      <option value="custom">Upload Custom Header Image (PNG, JPEG, JPG)</option>
                      <option value="promptwars">PromptWars Glowing Banner (Image 2 style)</option>
                      <option value="logos">Silver Oak & IEEE SB Banner</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bg-type" className="form-label" style={{ fontWeight: '600' }}>Email Body Style</label>
                    <select id="bg-type" className="form-control" value={backgroundType} onChange={(e) => setBackgroundType(e.target.value)}>
                      <option value="light">Classic Light (Clean Card)</option>
                      <option value="dark">Sleek Dark Mode (Modern Slate)</option>
                    </select>
                  </div>
                </div>

                {/* PromptWars Header style details config */}
                {headerType === 'promptwars' && (
                  <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                      PromptWars Banner Settings
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label" style={{ color: '#94a3b8', fontSize: '12px' }}>Header Title</label>
                        <input type="text" className="form-control" style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} value={headerTitle} onChange={(e) => setHeaderTitle(e.target.value)} placeholder="In-person PromptWars" />
                      </div>
                      <div>
                        <label className="form-label" style={{ color: '#94a3b8', fontSize: '12px' }}>Header Subtitle</label>
                        <input type="text" className="form-control" style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} value={headerSubtitle} onChange={(e) => setHeaderSubtitle(e.target.value)} placeholder="Build, pitch & win in one day" />
                      </div>
                      <div>
                        <label className="form-label" style={{ color: '#94a3b8', fontSize: '12px' }}>Header Badge Text</label>
                        <input type="text" className="form-control" style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} value={headerBadge} onChange={(e) => setHeaderBadge(e.target.value)} placeholder="Google for Developers | H2S" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Banner Image upload */}
                {headerType === 'custom' && (
                  <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px dashed #cbd5e1' }}>
                    <label className="form-label" style={{ fontWeight: '600' }}>Upload Header Banner (PNG, JPEG, JPG)</label>
                    <input type="file" accept=".png,.jpeg,.jpg" className="form-control" onChange={(e) => setHeaderImage(e.target.files[0])} required={headerType === 'custom'} />
                    {headerImage && <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>✓ Selected: {headerImage.name}</div>}
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                    Color Theme Selection
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {/* Purple Swatch */}
                    <button
                      type="button"
                      title="Royal Purple"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#4f46e5',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'purple' ? '0 0 0 2px #fff, 0 0 0 4px #4f46e5' : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'purple' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}
                      onClick={() => setColorTheme('purple')}
                    >
                      {colorTheme === 'purple' && '✓'}
                    </button>

                    {/* Emerald Swatch */}
                    <button
                      type="button"
                      title="Glowing Emerald"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'emerald' ? '0 0 0 2px #fff, 0 0 0 4px #10b981' : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'emerald' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}
                      onClick={() => setColorTheme('emerald')}
                    >
                      {colorTheme === 'emerald' && '✓'}
                    </button>

                    {/* Blue Swatch */}
                    <button
                      type="button"
                      title="Ocean Blue"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'blue' ? '0 0 0 2px #fff, 0 0 0 4px #0284c7' : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'blue' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}
                      onClick={() => setColorTheme('blue')}
                    >
                      {colorTheme === 'blue' && '✓'}
                    </button>

                    {/* Red Swatch */}
                    <button
                      type="button"
                      title="Sunset Red"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'red' ? '0 0 0 2px #fff, 0 0 0 4px #ef4444' : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'red' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}
                      onClick={() => setColorTheme('red')}
                    >
                      {colorTheme === 'red' && '✓'}
                    </button>

                    {/* Amber Swatch */}
                    <button
                      type="button"
                      title="Golden Amber"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'amber' ? '0 0 0 2px #fff, 0 0 0 4px #f59e0b' : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'amber' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                      }}
                      onClick={() => setColorTheme('amber')}
                    >
                      {colorTheme === 'amber' && '✓'}
                    </button>

                    {/* Canva Style Custom Color Swatch */}
                    <button
                      type="button"
                      title="Custom Color Swatch Picker"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #f06, #9f6, #06f)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: colorTheme === 'custom' ? `0 0 0 2px #fff, 0 0 0 4px ${customColor}` : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: colorTheme === 'custom' ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '18px'
                      }}
                      onClick={() => setColorTheme('custom')}
                    >
                      {colorTheme === 'custom' ? '✓' : '+'}
                    </button>

                    <div style={{ marginLeft: '8px', fontSize: '14px', color: '#64748b', textTransform: 'capitalize', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: colorTheme === 'custom' ? customColor : (colorTheme === 'purple' ? '#4f46e5' : colorTheme === 'emerald' ? '#10b981' : colorTheme === 'blue' ? '#0284c7' : colorTheme === 'red' ? '#ef4444' : '#f59e0b')
                      }}></span>
                      {colorTheme === 'custom' ? `Custom Theme (${customColor})` : `${colorTheme} preset selected`}
                    </div>
                  </div>

                  {colorTheme === 'custom' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#fff',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      maxWidth: '380px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <input
                          id="custom-color-picker"
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          style={{
                            position: 'absolute',
                            width: '200%',
                            height: '200%',
                            top: '-50%',
                            left: '-50%',
                            cursor: 'pointer',
                            border: 'none',
                            outline: 'none',
                            padding: 0
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>HEX Color Code</span>
                        <input
                          type="text"
                          className="form-control"
                          value={customColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.startsWith('#') || val.length <= 6) {
                              setCustomColor(val.startsWith('#') ? val : `#${val}`);
                            }
                          }}
                          placeholder="#00c4cc"
                          style={{
                            border: 'none',
                            padding: '4px 0',
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#1e293b',
                            background: 'transparent',
                            outline: 'none',
                            height: 'auto',
                            boxShadow: 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <fieldset className="email-config">
                <legend className="sr-only">Email Configuration</legend>

                <div className="form-group">
                  <label htmlFor="sender-name" className="form-label">Sender Display Name (Optional)</label>
                  <input
                    id="sender-name"
                    type="text"
                    className="form-control"
                    value={senderDisplayName}
                    onChange={(e) => setSenderDisplayName(e.target.value)}
                    placeholder="e.g., Silver Oak University IEEE SB"
                    aria-describedby="sender-name-help"
                  />
                  <div id="sender-name-help" className="input-help-text">
                    Custom name that recipients will see as the sender (e.g., "Silver Oak University IEEE SB events.ieee@socet.edu.in"). If empty, only your Gmail address will be shown.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email-subject" className="form-label">Email Subject</label>
                  <input
                    id="email-subject"
                    type="text"
                    className="form-control"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    required
                    aria-describedby="subject-help"
                  />
                  <div id="subject-help" className="sr-only">
                    Enter the subject line that will appear in all sent emails
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email-body" className="form-label">Email Body Template</label>
                  <textarea
                    id="email-body"
                    className="form-control"
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    placeholder="Enter email body template..."
                    rows="6"
                    required
                    aria-describedby="body-help"
                  />
                  <div id="body-help" className="input-help-text">
                    Use {'{Name}'} and {'{CertificateID}'} as placeholders that will be replaced with actual recipient data
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%' }}
                aria-describedby="send-button-help"
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    <span>Sending Emails...</span>
                    <span className="sr-only">Please wait while emails are being sent</span>
                  </>
                ) : (
                  <>
                    Send Mass Emails
                  </>
                )}
              </button>
              <div id="send-button-help" className="sr-only">
                Click to start sending emails to all recipients in the CSV file with their corresponding certificates
              </div>
            </form>
          </section>
        )}

        <div className="md-how-to-use">
          <h3 className="md-how-to-use-title">How to Use</h3>
          <div className="md-how-to-use-stepper">
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">1</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Sign in with Gmail</h4>
                <p className="md-how-to-use-step-description">Connect your Gmail account to enable email sending. This allows the system to send emails on your behalf using Gmail's secure API.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">2</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Upload Certificate ZIP File</h4>
                <p className="md-how-to-use-step-description">Upload a ZIP file containing all certificate PDFs. Each certificate should be named to match the Certificate ID in your CSV file.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">3</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Upload Recipient CSV File</h4>
                <p className="md-how-to-use-step-description">Upload a CSV file with columns: Sr_No, Name, Mail, Certificate ID. This file contains all recipient information and certificate mappings.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">4</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Customize Email Settings</h4>
                <p className="md-how-to-use-step-description">Set a custom sender display name (optional), email subject, and body template with placeholders like {'{Name}'} and {'{CertificateID}'}. These will be automatically replaced for each recipient.</p>
              </div>
            </div>
            <div className="md-how-to-use-step">
              <div className="md-how-to-use-step-number">5</div>
              <div className="md-how-to-use-step-content">
                <h4 className="md-how-to-use-step-title">Send Mass Emails</h4>
                <p className="md-how-to-use-step-description">Click "Send Mass Emails" to start the process. A results CSV file will be automatically downloaded with delivery status for each recipient.</p>
              </div>
            </div>
          </div>
        </div>

        {results && (
          <div className="space-y-6">
            {results.results?.some(r => r.error && r.error.includes('gmail.googleapis.com')) && (
              <div className="md-card alert-danger-card mb-6" style={{ borderLeft: '4px solid #f44336', backgroundColor: '#ffebee' }}>
                <div className="md-card-content" style={{ padding: '20px' }}>
                  <h3 className="text-danger font-bold text-lg mb-2" style={{ color: '#d32f2f', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Action Required: Enable Gmail API in Google Cloud Console
                  </h3>
                  <p className="mb-4 text-secondary" style={{ margin: '10px 0', color: '#555' }}>
                    Your Firebase project does not have the **Gmail API** enabled yet. You must enable it in your Google Cloud Console before emails can be sent on behalf of your Google account.
                  </p>
                  {(() => {
                    const errObj = results.results.find(r => r.error && r.error.includes('gmail.googleapis.com'));
                    const urlMatch = errObj.error.match(/https:\/\/console\S+/);
                    const url = urlMatch ? urlMatch[0] : 'https://console.developers.google.com/apis/api/gmail.googleapis.com/overview';
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-md"
                        style={{
                          textDecoration: 'none',
                          display: 'inline-block',
                          backgroundColor: '#d32f2f',
                          borderColor: '#d32f2f',
                          color: '#fff',
                          padding: '10px 16px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        Enable Gmail API Now
                      </a>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="md-card">
              <div className="md-card-header">
                <h3 className="md-card-title">Email Results</h3>
              </div>
              <div className="md-card-content">
                <div className="grid grid-3">
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{results.total}</div>
                    <div className="text-sm text-secondary font-medium">Total</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-success mb-2">{results.sent}</div>
                    <div className="text-sm text-secondary font-medium">Sent</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-3xl font-bold text-danger mb-2">{results.failed}</div>
                    <div className="text-sm text-secondary font-medium">Failed</div>
                  </div>
                </div>

                {results.failed > 0 && (
                  <div className="mt-8" style={{ marginTop: '30px' }}>
                    <h4 className="font-semibold text-danger mb-4" style={{ color: '#d32f2f', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                      Failed Recipients & Diagnostic Details
                    </h4>
                    <div className="results-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                      <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', backgroundColor: '#f9f9f9', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Name</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Email Address</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Error Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.results.filter(r => r.status === 'failed').map((r, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '12px 16px' }}>{r.name || 'Unknown'}</td>
                              <td style={{ padding: '12px 16px', color: '#555' }}>{r.email}</td>
                              <td style={{ padding: '12px 16px', color: '#d32f2f', wordBreak: 'break-word' }}>{r.error || 'Unknown error'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassMailer;