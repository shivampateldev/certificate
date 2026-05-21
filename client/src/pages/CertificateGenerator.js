import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { templateAPI } from '../services/api';
import './CertificateGenerator.css';

// ─── Step 1: Pick a template ────────────────────────────────────────────────
const TemplatePicker = ({ onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    templateAPI.getAllTemplates({ isActive: true })
      .then(r => setTemplates(r.data.data || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  };

  const handleTemplateUploaded = (newTemplate) => {
    setShowUploader(false);
    loadTemplates();
    toast.success('Template uploaded successfully!');
  };

  if (loading) return <div className="loading-state"><div className="spinner" style={{width:32,height:32,borderColor:'var(--border-color)',borderTopColor:'var(--primary-blue)'}}></div><p>Loading templates…</p></div>;

  if (showUploader) {
    const TemplateUploader = require('../components/TemplateUploader').default;
    return <TemplateUploader onTemplateUploaded={handleTemplateUploaded} onCancel={() => setShowUploader(false)} />;
  }

  if (templates.length === 0)
    return (
      <div className="loading-state">
        <p style={{fontSize:'2rem',marginBottom:8}}>📄</p>
        <h3>No Templates Found</h3>
        <p>Upload a certificate template (PNG, JPG, or PDF) to get started.</p>
        <div style={{marginTop:16}}>
          <button className="btn btn-primary" onClick={() => setShowUploader(true)}>
            📤 Upload Template
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h2 style={{marginBottom:8}}>Select a Certificate Template</h2>
          <p style={{color:'var(--text-secondary)',marginBottom:0}}>Choose the background image template to use for generation.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowUploader(true)} style={{whiteSpace:'nowrap'}}>
          📤 Upload Template
        </button>
      </div>
      <div className="batches-grid">
        {templates.map(t => (
          <div key={t.id} className="batch-card" style={{cursor:'pointer',position:'relative'}} onClick={() => onSelect(t)}>
            {t.imageBase64
              ? <img src={t.imageBase64} alt={t.name} style={{width:'100%',borderRadius:8,marginBottom:12,maxHeight:160,objectFit:'cover'}} />
              : <div style={{width:'100%',height:120,background:'var(--secondary-background)',borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)'}}>No preview</div>
            }
            <h3 style={{margin:'0 0 6px'}}>{t.name}</h3>
            {t.description && <p style={{color:'var(--text-secondary)',fontSize:13,margin:'0 0 8px'}}>{t.description}</p>}
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={(e) => { e.stopPropagation(); onSelect(t); }}>
                Use This Template →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Step 2: Configure field positions on canvas ─────────────────────────────
const FIELDS = [
  { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
  { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
  { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
  { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
];

const FieldConfigurator = ({ template, fieldConfig, onSave, onBack }) => {
  const canvasRef = useRef(null);
  const [config, setConfig] = useState(() => {
    const base = {};
    FIELDS.forEach(f => {
      base[f.key] = fieldConfig[f.key] || { x: 400, y: 300, fontSize: 32, fontFamily: 'Arial', bold: false, enabled: f.key === 'name' || f.key === 'certificateId' };
    });
    return base;
  });
  const [active, setActive] = useState('name');
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (template.imageBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawFields(ctx, canvas);
      };
      img.src = template.imageBase64;
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No template image — positions will still be saved', canvas.width / 2, canvas.height / 2);
      drawFields(ctx, canvas);
    }
  }, [config, active, template]); // eslint-disable-line

  const drawFields = (ctx, canvas) => {
    FIELDS.forEach(f => {
      const c = config[f.key];
      if (!c.enabled) return;
      ctx.font = `${c.bold ? 'bold ' : ''}${c.fontSize}px ${c.fontFamily}`;
      ctx.fillStyle = f.color;
      ctx.textAlign = 'left';
      ctx.fillText(f.label, c.x, c.y);
      if (f.key === active) {
        const w = ctx.measureText(f.label).width;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(c.x - 4, c.y - c.fontSize - 4, w + 8, c.fontSize + 10);
        ctx.setLineDash([]);
      }
    });
  };

  useEffect(() => {
    if (template.imageBase64) {
      const img = new Image();
      img.onload = () => {
        const maxW = 800, maxH = 560;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        setImgSize({ w: Math.round(w), h: Math.round(h) });
      };
      img.src = template.imageBase64;
    }
  }, [template]);

  useEffect(() => { draw(); }, [draw, imgSize]);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setConfig(prev => ({ ...prev, [active]: { ...prev[active], x, y } }));
  };

  const update = (field, prop, val) =>
    setConfig(prev => ({ ...prev, [field]: { ...prev[field], [prop]: val } }));

  return (
    <div className="text-editor">
      <div className="editor-header">
        <h2>Position Certificate Fields</h2>
        <p>Click on the template to place the selected field. Enable/disable fields as needed.</p>
      </div>
      <div className="editor-layout">
        <div className="canvas-section">
          <canvas
            ref={canvasRef}
            width={imgSize.w}
            height={imgSize.h}
            onClick={handleCanvasClick}
            className="template-canvas"
            style={{cursor:'crosshair',maxWidth:'100%'}}
          />
          <p style={{fontSize:12,color:'var(--text-secondary)',marginTop:6,textAlign:'center'}}>
            Editing: <strong style={{color: FIELDS.find(f=>f.key===active)?.color}}>{FIELDS.find(f=>f.key===active)?.label}</strong> — click canvas to reposition
          </p>
        </div>

        <div className="controls-section">
          <div className="element-selector">
            <h3>Fields</h3>
            <div className="element-buttons" style={{flexDirection:'column',gap:6}}>
              {FIELDS.map(f => (
                <div key={f.key} style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={config[f.key].enabled}
                    onChange={e => update(f.key, 'enabled', e.target.checked)} id={`en-${f.key}`} />
                  <button
                    className={`element-btn${active === f.key ? ' active' : ''}`}
                    style={{flex:1, borderColor: active===f.key ? f.color : undefined, background: active===f.key ? f.color : undefined}}
                    onClick={() => { update(f.key, 'enabled', true); setActive(f.key); }}
                  >{f.label}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-properties" style={{marginTop:16}}>
            <h3>Properties — {FIELDS.find(f=>f.key===active)?.label}</h3>
            <div className="form-group">
              <label>Font Size</label>
              <input type="range" min="10" max="80" value={config[active].fontSize}
                onChange={e => update(active, 'fontSize', +e.target.value)} className="font-size-slider" />
              <span className="font-size-value">{config[active].fontSize}px</span>
            </div>
            <div className="form-group">
              <label>Font</label>
              <select value={config[active].fontFamily} onChange={e => update(active, 'fontFamily', e.target.value)} className="form-control">
                {['Arial','Helvetica','Times New Roman','Georgia','Verdana','Trebuchet MS','Impact'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={config[active].bold} onChange={e => update(active, 'bold', e.target.checked)} /> Bold
              </label>
            </div>
            <div className="form-group">
              <label>X</label>
              <input type="number" value={config[active].x} onChange={e => update(active, 'x', +e.target.value)} className="form-control" />
            </div>
            <div className="form-group">
              <label>Y</label>
              <input type="number" value={config[active].y} onChange={e => update(active, 'y', +e.target.value)} className="form-control" />
            </div>
          </div>
        </div>
      </div>

      <div className="editor-actions">
        <button onClick={onBack} className="btn btn-secondary">← Back</button>
        <button onClick={() => { onSave({ ...config, canvasWidth: imgSize.w, canvasHeight: imgSize.h }); toast.success('Field positions saved!'); }} className="btn btn-primary">
          Save & Continue →
        </button>
      </div>
    </div>
  );
};

// ─── Step 3: Upload CSV / paste data → generate & download ──────────────────
const GenerateStep = ({ template, fieldConfig, onBack }) => {
  const [participants, setParticipants] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    }).filter(r => r.Name || r.name);
    setParticipants(rows);
    setResults(null);
    toast.success(`Loaded ${rows.length} participants`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1
  });

  const generate = async () => {
    if (!participants.length) { toast.error('Upload a CSV first'); return; }
    if (!template.imageBase64) { toast.error('Template has no image. Add an image in Template Management.'); return; }

    setProcessing(true);
    const res = [];

    for (const row of participants) {
      const name = row.Name || row.name || '';
      const email = row.Email || row.email || '';
      const certId = row.Certificate_ID || row.certificate_id || row['Certificate ID'] || `CERT-${Date.now()}`;
      const date = row.Date || row.date || new Date().toLocaleDateString();

      try {
        const pdfBlob = await buildCertificatePDF(template, fieldConfig, { name, email, certificateId: certId, date });
        saveAs(pdfBlob, `${certId}.pdf`);
        res.push({ name, email, certificateId: certId, status: 'success' });
      } catch (err) {
        res.push({ name, email, certificateId: certId, status: 'failed', error: err.message });
      }
    }

    setResults(res);
    const ok = res.filter(r => r.status === 'success').length;
    toast.success(`Generated ${ok} / ${res.length} certificates`);
    setProcessing(false);
  };

  return (
    <div className="bulk-processor">
      <div className="processor-header">
        <h2>Generate Certificates</h2>
        <p>Upload a CSV with participant data. Certificates are generated client-side and downloaded instantly.</p>
      </div>

      <div className="processor-layout">
        <div className="upload-section">
          <h3>Upload CSV</h3>
          <div {...getRootProps()} className={`excel-dropzone${isDragActive ? ' active' : ''}`}>
            <input {...getInputProps()} />
            {participants.length > 0
              ? <div className="file-selected"><div className="file-icon">✓</div><div className="file-info"><h4>{participants.length} participants loaded</h4></div></div>
              : <div className="upload-prompt"><div className="upload-icon">⊞</div><h4>{isDragActive ? 'Drop CSV here' : 'Drag & drop CSV'}</h4><p>or <span className="browse-text">browse</span></p></div>
            }
          </div>

          <div className="excel-format-info" style={{marginTop:16}}>
            <h4>Required CSV columns</h4>
            <div className="format-table">
              <div className="table-header"><span>Sr_no</span><span>Name</span><span>Email</span><span>Certificate_ID</span><span>Date</span></div>
              <div className="table-row"><span>1</span><span>John Doe</span><span>john@example.com</span><span>CERT-001</span><span>2024-01-01</span></div>
            </div>
            <p style={{fontSize:12,color:'var(--text-secondary)',marginTop:8}}>
              Fields map to: <code>{'{{NAME}}'}</code> <code>{'{{EMAIL}}'}</code> <code>{'{{CERTIFICATE_ID}}'}</code> <code>{'{{DATE}}'}</code>
            </p>
          </div>

          <div style={{background:'var(--secondary-background)',padding:12,borderRadius:8,marginTop:12}}>
            <h4 style={{margin:'0 0 8px',fontSize:13}}>💡 How Placeholders Work</h4>
            <p style={{margin:'0 0 6px',fontSize:12,color:'var(--text-secondary)'}}>
              The template uses <strong>placeholder fields</strong> like <code>{'{{NAME}}'}</code> that automatically get replaced with data from your CSV:
            </p>
            <ul style={{margin:'6px 0',paddingLeft:20,fontSize:12,color:'var(--text-secondary)'}}>
              <li><code>{'{{NAME}}'}</code> → Replaced with the "Name" column from CSV</li>
              <li><code>{'{{EMAIL}}'}</code> → Replaced with the "Email" column from CSV</li>
              <li><code>{'{{CERTIFICATE_ID}}'}</code> → Replaced with the "Certificate_ID" column from CSV</li>
              <li><code>{'{{DATE}}'}</code> → Replaced with the "Date" column from CSV</li>
            </ul>
            <p style={{margin:'6px 0',fontSize:12,color:'var(--text-secondary)'}}>
              Each row in your CSV generates a unique certificate with its own data filled in.
            </p>
          </div>
        </div>

        <div className="process-section">
          <h3>Template: {template.name}</h3>
          {template.imageBase64 && <img src={template.imageBase64} alt="" style={{width:'100%',borderRadius:8,marginBottom:12,maxHeight:140,objectFit:'cover'}} />}
          
          <div style={{background:'var(--secondary-background)',padding:12,borderRadius:8,marginBottom:12}}>
            <h4 style={{margin:'0 0 8px'}}>Template Information</h4>
            {template.description && <p style={{margin:'0 0 6px',fontSize:13,color:'var(--text-secondary)'}}>{template.description}</p>}
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {(template.categories||[]).map(c => <span key={c} style={{background:'var(--primary-100)',color:'var(--primary-800)',borderRadius:12,padding:'2px 8px',fontSize:12}}>{c}</span>)}
            </div>
          </div>

          <div className="template-summary">
            <h4 style={{margin:'0 0 8px'}}>Configured Fields</h4>
            {FIELDS.filter(f => fieldConfig[f.key]?.enabled).map(f => (
              <div key={f.key} className="summary-item">
                <label>{f.label}</label>
                <span>X:{fieldConfig[f.key].x} Y:{fieldConfig[f.key].y} {fieldConfig[f.key].fontSize}px {fieldConfig[f.key].bold ? '(bold)' : ''}</span>
              </div>
            ))}
            {FIELDS.filter(f => fieldConfig[f.key]?.enabled).length === 0 && (
              <p style={{fontSize:13,color:'var(--text-secondary)',margin:0}}>No fields configured. Go back to position fields.</p>
            )}
          </div>
          <button onClick={generate} disabled={!participants.length || processing} className="btn btn-primary process-btn" style={{marginTop:16}}>
            {processing ? <><span className="spinner-small"></span>Generating…</> : `Generate ${participants.length || ''} Certificates`}
          </button>
        </div>
      </div>

      {participants.length > 0 && !results && (
        <div style={{marginTop:24,overflowX:'auto'}}>
          <h3>Preview ({participants.length} rows)</h3>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'var(--secondary-background)'}}>
                {Object.keys(participants[0]).map(k => <th key={k} style={{padding:'6px 10px',textAlign:'left',borderBottom:'1px solid var(--border-color)'}}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {participants.slice(0,5).map((row,i) => (
                <tr key={i}>
                  {Object.values(row).map((v,j) => <td key={j} style={{padding:'6px 10px',borderBottom:'1px solid var(--border-color)'}}>{v}</td>)}
                </tr>
              ))}
              {participants.length > 5 && <tr><td colSpan={Object.keys(participants[0]).length} style={{padding:'6px 10px',color:'var(--text-secondary)',fontStyle:'italic'}}>…and {participants.length-5} more</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {results && (
        <div className="results-section" style={{marginTop:24}}>
          <div className="results-header">
            <h3>Results</h3>
            <div className="results-summary">
              <span className="success-count">✓ {results.filter(r=>r.status==='success').length} Generated</span>
              <span className="failed-count">✕ {results.filter(r=>r.status==='failed').length} Failed</span>
            </div>
          </div>
          <div className="results-table">
            <div className="table-header"><span>Status</span><span>Name</span><span>Certificate ID</span><span>Email</span></div>
            {results.map((r,i) => (
              <div key={i} className="table-row">
                <span style={{color: r.status==='success' ? '#16a34a' : '#dc2626'}}>{r.status==='success' ? '✓' : '✕'}</span>
                <span>{r.name}</span>
                <span>{r.certificateId}</span>
                <span>{r.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="processor-actions">
        <button onClick={onBack} className="btn btn-secondary">← Back</button>
        {results && <button onClick={() => { setResults(null); setParticipants([]); }} className="btn btn-secondary">Generate Another</button>}
      </div>
    </div>
  );
};

// ─── Client-side PDF builder using canvas ────────────────────────────────────
async function buildCertificatePDF(template, fieldConfig, data) {
  // Dynamically import jsPDF only when needed
  const { jsPDF } = await import('jspdf');

  const img = await loadImage(template.imageBase64);
  const W = img.width, H = img.height;

  // Dynamically detect image format from base64
  let format = 'PNG';
  if (template.imageBase64 && template.imageBase64.startsWith('data:image/')) {
    const match = template.imageBase64.match(/^data:image\/(\w+);base64/);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') {
        format = 'JPEG';
      } else if (ext === 'webp') {
        format = 'WEBP';
      }
    }
  }

  // jsPDF in px units
  const pdf = new jsPDF({ orientation: W > H ? 'landscape' : 'portrait', unit: 'px', format: [W, H] });
  pdf.addImage(template.imageBase64, format, 0, 0, W, H);

  const fieldValues = {
    name: data.name,
    certificateId: data.certificateId,
    email: data.email,
    date: data.date,
  };

  // Calculate coordinates scaling based on configured canvas size vs original size
  const canvasW = fieldConfig.canvasWidth || 800;
  const canvasH = fieldConfig.canvasHeight || 600;
  const scaleX = W / canvasW;
  const scaleY = H / canvasH;
  const avgScale = (scaleX + scaleY) / 2;

  // Safe mapping of fonts to standard core PDF fonts supported by jsPDF
  const mapFontFamily = (fontName) => {
    const name = (fontName || '').toLowerCase().trim();
    if (name.includes('times') || name.includes('georgia')) return 'times';
    if (name.includes('courier')) return 'courier';
    return 'helvetica';
  };

  FIELDS.forEach(f => {
    const cfg = fieldConfig[f.key];
    if (!cfg || !cfg.enabled) return;
    const value = fieldValues[f.key] || '';
    
    // Scale position and font size
    const pdfX = cfg.x * scaleX;
    const pdfY = cfg.y * scaleY;
    const pdfFontSize = cfg.fontSize * avgScale;

    pdf.setFontSize(pdfFontSize);
    pdf.setFont(mapFontFamily(cfg.fontFamily), cfg.bold ? 'bold' : 'normal');
    
    // jsPDF y is baseline same as canvas
    pdf.text(value, pdfX, pdfY);
  });

  return pdf.output('blob');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CertificateGenerator = () => {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState(null);
  const [fieldConfig, setFieldConfig] = useState({});

  const steps = [
    { number: 1, title: 'Select Template' },
    { number: 2, title: 'Position Fields' },
    { number: 3, title: 'Generate' },
  ];

  return (
    <div className="certificate-generator">
      <div className="container">
        <div className="page-header">
          <h1>Certificate Generator</h1>
          <p>Pick a template, position your fields, then generate PDFs from participant data</p>
        </div>

        <div className="steps-indicator">
          {steps.map(s => (
            <div key={s.number} className={`step-indicator${step >= s.number ? ' active' : ''}`}>
              <div className="step-number">{s.number}</div>
              <div className="step-title">{s.title}</div>
            </div>
          ))}
        </div>

        <div className="step-content">
          {step === 1 && (
            <TemplatePicker onSelect={t => { setTemplate(t); setStep(2); }} />
          )}
          {step === 2 && template && (
            <FieldConfigurator
              template={template}
              fieldConfig={fieldConfig}
              onSave={cfg => { setFieldConfig(cfg); setStep(3); }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && template && (
            <GenerateStep
              template={template}
              fieldConfig={fieldConfig}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;
