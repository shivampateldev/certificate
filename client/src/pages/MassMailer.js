import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import { massMailAPI } from '../services/api';
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('gmail_access_token');
    const email = localStorage.getItem('gmail_user_email');
    if (token && email) {
      setIsAuthenticated(true);
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

    if (!zipFile || !csvFile) {
      toast.error('Please select both ZIP file and CSV file');
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
      formData.append('zipfile', zipFile);
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

              <fieldset className="file-uploads grid grid-2">
                <legend className="sr-only">File Upload Section</legend>

                <div className="form-group">
                  <label htmlFor="zip-file" className="form-label">
                    Certificate ZIP File
                  </label>
                  <input
                    id="zip-file"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files[0])}
                    required
                    className="form-control"
                    aria-describedby="zip-file-help"
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

                <div className="form-group">
                  <label htmlFor="csv-file" className="form-label">
                    Recipient CSV File
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassMailer;