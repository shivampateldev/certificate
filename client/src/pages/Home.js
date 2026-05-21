import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const stats = [
  { icon: '⊞', label: 'Certificates Generated', value: '—', change: 'All time', color: 'purple' },
  { icon: '⧇', label: 'Total Participants', value: '—', change: 'Across all batches', color: 'cyan' },
  { icon: '⧄', label: 'Emails Sent', value: '—', change: 'Via mass mailer', color: 'green' },
  { icon: '⧉', label: 'Templates', value: '2+', change: 'Ready to use', color: 'amber' },
];

const features = [
  {
    icon: '⧁',
    title: 'Certificate Generator',
    desc: 'Upload a template, position text fields, and generate certificates in bulk from Excel/CSV data.',
    link: '/generate',
    cta: 'Start Generating',
    color: 'purple',
  },
  {
    icon: '⧇',
    title: 'Participant Management',
    desc: 'Upload and manage participant data. Edit inline, filter, sort, and export to CSV or Excel.',
    link: '/participants',
    cta: 'Manage Participants',
    color: 'cyan',
  },
  {
    icon: '⧄',
    title: 'Mass Mailer',
    desc: 'Send certificates to all recipients via Gmail. Upload a ZIP of PDFs and a CSV recipient list.',
    link: '/mass-mailer',
    cta: 'Send Emails',
    color: 'green',
  },
  {
    icon: '⧉',
    title: 'Template Management',
    desc: 'Create and manage certificate templates. Assign categories and keep your designs organized.',
    link: '/templates',
    cta: 'Manage Templates',
    color: 'amber',
  },
  {
    icon: '⧠',
    title: 'Reports & Analytics',
    desc: 'View delivery stats, email campaign metrics, and certificate generation reports.',
    link: '/reports',
    cta: 'View Reports',
    color: 'red',
  },
];

const steps = [
  { n: '1', icon: '✦', title: 'Upload Template', desc: 'Upload your certificate design as PNG, JPG, or PDF.' },
  { n: '2', icon: '◈', title: 'Configure Text', desc: 'Position name and certificate ID fields on the template.' },
  { n: '3', icon: '❖', title: 'Upload Data', desc: 'Upload an Excel/CSV file with participant information.' },
  { n: '4', icon: '⧁', title: 'Generate & Send', desc: 'Generate all certificates and distribute via mass mailer.' },
];

const Home = () => (
  <div className="home-page">
    {/* Hero Banner */}
    <div className="hero-banner">
      <h1>Certificate Management Platform</h1>
      <p>Generate professional certificates, manage participants, and send bulk emails — all in one place.</p>
      <div className="hero-banner-actions">
        <Link to="/generate" className="btn btn-white">Generate Certificates</Link>
        <Link to="/mass-mailer" className="btn btn-outline-white">Send Emails</Link>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-4 mb-6">
      {stats.map((s, i) => (
        <div className="stat-card" key={i}>
          <div className={`stat-icon ${s.color}`}>{s.icon}</div>
          <div className="stat-info">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Features */}
    <div className="card mb-6">
      <div className="card-header">
        <div>
          <div className="card-title">Platform Features</div>
          <div className="card-subtitle">Everything you need to manage certificates</div>
        </div>
      </div>
      <div className="card-body">
        <div className="features-grid">
          {features.map((f, i) => (
            <div className={`feature-card feature-${f.color}`} key={i}>
              <div className="feature-card-icon">{f.icon}</div>
              <div className="feature-card-body">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
              <Link to={f.link} className="btn btn-primary btn-sm feature-card-btn">{f.cta} →</Link>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* How it works */}
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">How It Works</div>
          <div className="card-subtitle">4 simple steps to generate and distribute certificates</div>
        </div>
      </div>
      <div className="card-body">
        <div className="steps-grid">
          {steps.map((s, i) => (
            <div className="step-card" key={i}>
              <div className="step-number">{s.n}</div>
              <div className="step-icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Home;
