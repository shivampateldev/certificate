import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { templateAPI, certificateAPI } from '../services/api';
import './CertificateGenerator.css';

// Custom ID pattern evaluator helper
const generateCustomCertificateId = (pattern, name) => {
  if (!pattern) return '';
  let customId = pattern;
  customId = customId.replace(/\{\{random_number\((x+)\)\}\}/gi, (match, grp) => {
    let numStr = '';
    for (let i = 0; i < grp.length; i++) {
      numStr += Math.floor(Math.random() * 10);
    }
    return numStr;
  });
  customId = customId.replace(/\{\{name\((\d+)\s*,\s*(\d+)\)\}\}/gi, (match, start, end) => {
    const s = parseInt(start);
    const e = parseInt(end);
    const cleanedName = name.replace(/[^a-zA-Z]/g, '');
    return cleanedName.substring(s, e).toUpperCase();
  });
  return customId;
};

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
const FieldConfigurator = ({ template, fieldConfig, onSave, onBack }) => {
  const canvasRef = useRef(null);
  const [fields, setFields] = useState(() => {
    return [
      { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
      { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
      { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
      { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
    ];
  });

  const [config, setConfig] = useState(() => {
    const base = {};
    const defaults = [
      { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
      { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
      { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
      { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
    ];
    defaults.forEach(f => {
      base[f.key] = fieldConfig[f.key] || { x: 400, y: 300, fontSize: 32, fontFamily: 'Arial', bold: false, enabled: f.key === 'name' || f.key === 'certificateId' };
    });
    return base;
  });

  const [active, setActive] = useState('name');
  const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
  const [newFieldName, setNewFieldName] = useState('');

  const getRandomColor = (str) => {
    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2', '#ea580c'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await templateAPI.getFields(template.id);
        const backendFields = res.data.data || [];
        
        if (backendFields.length > 0) {
          const loadedFields = backendFields.map(bf => {
            const keyName = bf.field_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
            return {
              key: keyName,
              label: bf.field_name.startsWith('{{') ? bf.field_name : `{{${bf.field_name.toUpperCase()}}}`,
              color: bf.color || getRandomColor(keyName),
              x: bf.x || 400,
              y: bf.y || 300,
              fontSize: bf.font_size || 32,
              fontFamily: bf.font_family || 'Arial',
              bold: bf.font_weight === 'bold',
              enabled: bf.enabled !== false
            };
          });

          const defaults = [
            { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
            { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
            { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
            { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
          ];

          const mergedFields = [...defaults];
          loadedFields.forEach(lf => {
            if (!mergedFields.some(df => df.key === lf.key)) {
              mergedFields.push(lf);
            }
          });

          setFields(mergedFields);

          const initialConfig = {};
          mergedFields.forEach(f => {
            const backendFieldMatch = loadedFields.find(lf => lf.key === f.key);
            initialConfig[f.key] = fieldConfig[f.key] || (backendFieldMatch ? {
              x: backendFieldMatch.x,
              y: backendFieldMatch.y,
              fontSize: backendFieldMatch.fontSize,
              fontFamily: backendFieldMatch.fontFamily,
              bold: backendFieldMatch.bold,
              enabled: backendFieldMatch.enabled
            } : {
              x: 400,
              y: 300,
              fontSize: 32,
              fontFamily: 'Arial',
              bold: false,
              enabled: f.key === 'name' || f.key === 'certificateId'
            });
          });

          setConfig(initialConfig);
          const firstActive = mergedFields.find(f => initialConfig[f.key]?.enabled)?.key || mergedFields[0].key;
          setActive(firstActive);
        }
      } catch (err) {
        console.error('Error fetching fields:', err);
      }
    };
    fetchFields();
  }, [template, fieldConfig]); // eslint-disable-line

  const drawFields = (ctx, canvas) => {
    fields.forEach(f => {
      const c = config[f.key];
      if (!c || !c.enabled) return;
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
  }, [config, active, template, fields]); // eslint-disable-line

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

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const cleanKey = newFieldName.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (fields.some(f => f.key === cleanKey)) {
      toast.error('Field already exists!');
      return;
    }

    const newField = {
      key: cleanKey,
      label: `{{${cleanKey.toUpperCase()}}}`,
      color: getRandomColor(cleanKey)
    };

    setFields(prev => [...prev, newField]);
    setConfig(prev => ({
      ...prev,
      [cleanKey]: {
        x: 400,
        y: 300,
        fontSize: 32,
        fontFamily: 'Arial',
        bold: false,
        enabled: true
      }
    }));
    setActive(cleanKey);
    setNewFieldName('');
    toast.success(`Added custom field ${newField.label}`);
  };

  const handleDeleteField = (keyToDelete) => {
    setFields(prev => prev.filter(f => f.key !== keyToDelete));
    setConfig(prev => {
      const copy = { ...prev };
      delete copy[keyToDelete];
      return copy;
    });
    if (active === keyToDelete) {
      setActive('name');
    }
    toast.success('Removed custom placeholder');
  };

  const handleSave = async () => {
    const fieldsPayload = fields.map(f => {
      const c = config[f.key];
      return {
        field_name: f.key,
        x: c?.x || 400,
        y: c?.y || 300,
        font_family: c?.fontFamily || 'Arial',
        font_size: c?.fontSize || 32,
        font_weight: c?.bold ? 'bold' : 'normal',
        color: f.color,
        enabled: c?.enabled || false
      };
    });

    try {
      await templateAPI.saveMapping(template.id, fieldsPayload);
      onSave({ ...config, fieldsList: fields, canvasWidth: imgSize.w, canvasHeight: imgSize.h });
      toast.success('Field mapping saved successfully!');
    } catch (err) {
      console.error('Failed to save mapping to server:', err);
      onSave({ ...config, fieldsList: fields, canvasWidth: imgSize.w, canvasHeight: imgSize.h });
      toast.success('Fields saved locally.');
    }
  };

  return (
    <div className="text-editor">
      <div className="editor-header">
        <h2>Position Certificate Fields</h2>
        <p>Click on the template to place the selected field. Enable/disable and add custom fields as needed.</p>
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
            Editing: <strong style={{color: fields.find(f=>f.key===active)?.color}}>{fields.find(f=>f.key===active)?.label}</strong> — click canvas to reposition
          </p>
        </div>

        <div className="controls-section">
          <div className="element-selector">
            <h3>Fields</h3>
            <div className="element-buttons" style={{flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto'}}>
              {fields.map(f => {
                const isDefault = ['name', 'certificateId', 'email', 'date'].includes(f.key);
                return (
                  <div key={f.key} style={{display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={config[f.key]?.enabled || false}
                      onChange={e => update(f.key, 'enabled', e.target.checked)} id={`en-${f.key}`} />
                    <button
                      className={`element-btn${active === f.key ? ' active' : ''}`}
                      style={{
                        flex:1, 
                        borderColor: active===f.key ? f.color : undefined, 
                        background: active===f.key ? f.color : undefined,
                        color: active===f.key ? '#fff' : undefined,
                        textAlign:'left',
                        padding:'6px 12px',
                        fontSize:13
                      }}
                      onClick={() => { update(f.key, 'enabled', true); setActive(f.key); }}
                    >{f.label}</button>
                    {!isDefault && (
                      <button 
                        onClick={() => handleDeleteField(f.key)}
                        style={{background:'none',border:'none',color:'var(--text-secondary)',cursor: 'pointer',padding:4}}
                        title="Remove custom placeholder"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Inline Custom Field Adder */}
            <div style={{marginTop:16, borderTop:'1px solid var(--border-color)', paddingTop:12}}>
              <h4 style={{margin:'0 0 8px', fontSize:13, color:'var(--text-secondary)'}}>➕ Add Custom Placeholder</h4>
              <div style={{display:'flex', gap:8}}>
                <input 
                  type="text" 
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  placeholder="e.g. course_name" 
                  className="form-control"
                  style={{fontSize:13, padding:'6px 10px'}}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddField(); }}
                />
                <button onClick={handleAddField} className="btn btn-primary" style={{padding:'6px 12px', fontSize:13}}>
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="text-properties" style={{marginTop:16}}>
            <h3>Properties — {fields.find(f=>f.key===active)?.label}</h3>
            <div className="form-group">
              <label>Font Size</label>
              <input type="range" min="10" max="80" value={config[active]?.fontSize || 32}
                onChange={e => update(active, 'fontSize', +e.target.value)} className="font-size-slider" />
              <span className="font-size-value">{config[active]?.fontSize || 32}px</span>
            </div>
            <div className="form-group">
              <label>Font</label>
              <select value={config[active]?.fontFamily || 'Arial'} onChange={e => update(active, 'fontFamily', e.target.value)} className="form-control">
                {['Arial','Helvetica','Times New Roman','Georgia','Verdana','Trebuchet MS','Impact'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={config[active]?.bold || false} onChange={e => update(active, 'bold', e.target.checked)} /> Bold
              </label>
            </div>
            <div className="form-group">
              <label>X</label>
              <input type="number" value={config[active]?.x || 400} onChange={e => update(active, 'x', +e.target.value)} className="form-control" />
            </div>
            <div className="form-group">
              <label>Y</label>
              <input type="number" value={config[active]?.y || 300} onChange={e => update(active, 'y', +e.target.value)} className="form-control" />
            </div>
          </div>
        </div>
      </div>

      <div className="editor-actions">
        <button onClick={onBack} className="btn btn-secondary">← Back</button>
        <button onClick={handleSave} className="btn btn-primary">
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
  
  // Custom Pattern Generator states
  const [generateCustomIds, setGenerateCustomIds] = useState(false);
  const [idPattern, setIdPattern] = useState('SOU-PYthon-{{random_number(xxxxxx)}}');
  
  // Export methods
  const [downloadMethod, setDownloadMethod] = useState('zip'); // 'zip' or 'separate'
  const [generateLocation, setGenerateLocation] = useState('server'); // 'server' or 'browser'

  // Server progress states
  const [progress, setProgress] = useState(0);
  const [progressCounter, setProgressCounter] = useState({ completed: 0, total: 0 });
  const [serverJobId, setServerJobId] = useState(null);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return;
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    }).filter(r => r.Name || r.name);
    
    setParticipants(rows);
    setResults(null);
    setProgress(0);
    setServerJobId(null);
    toast.success(`Loaded ${rows.length} participants`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1
  });

  const generate = async () => {
    if (!participants.length) { toast.error('Upload a CSV first'); return; }

    setProcessing(true);
    setProgress(0);

    if (generateLocation === 'server') {
      try {
        // Trigger server background generation job
        const response = await certificateAPI.generateCertificates(template.id, participants, idPattern, generateCustomIds);
        const { jobId, total } = response.data.data;
        setServerJobId(jobId);
        setProgressCounter({ completed: 0, total });

        // Poller loop
        const poller = setInterval(async () => {
          try {
            const statusRes = await certificateAPI.getGeneration(jobId);
            const { completed_count, certificate_count, status } = statusRes.data.data.generation;
            
            const pct = Math.round((completed_count / certificate_count) * 100) || 0;
            setProgress(pct);
            setProgressCounter({ completed: completed_count, total: certificate_count });

            if (status === 'completed' || completed_count === certificate_count) {
              clearInterval(poller);
              
              // Load the generated certificates to populate Activity Log
              const certs = statusRes.data.data.certificates || [];
              const serverUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:5000' 
                : `${window.location.protocol}//${window.location.host}`;

              setResults(certs.map(c => ({
                name: c.recipient_name || 'Participant',
                email: c.recipient_email || '',
                certificateId: c.certificate_id,
                date: new Date(c.created_at).toLocaleDateString(),
                certificateLink: `${serverUrl}/api/certificates/download/${c.certificate_id}`,
                status: 'success'
              })));

              setProcessing(false);
              toast.success('Server batch processing completed successfully!');
            } else if (status === 'failed') {
              clearInterval(poller);
              setProcessing(false);
              toast.error('Server batch generation job failed.');
            }
          } catch (pollErr) {
            console.error('Error polling job status:', pollErr);
          }
        }, 1000);

      } catch (err) {
        setProcessing(false);
        toast.error(`Failed to start server-side batch job: ${err.message}`);
      }
      return;
    }

    // Client-side local browser generation
    if (!template.imageBase64) { toast.error('Template has no image. Add an image in Template Management.'); setProcessing(false); return; }

    const res = [];
    const zip = new JSZip();

    for (let i = 0; i < participants.length; i++) {
      const row = participants[i];
      const name = row.Name || row.name || '';
      const email = row.Email || row.email || '';
      const date = row.Date || row.date || new Date().toLocaleDateString();
      
      let certId = row.Certificate_ID || row.certificate_id || row['Certificate ID'];
      if (generateCustomIds || !certId) {
        certId = generateCustomCertificateId(idPattern, name) || `CERT-${Date.now()}-${i}`;
      }

      try {
        const pdfBlob = await buildCertificatePDF(template, fieldConfig, { name, email, certificateId: certId, date });
        
        const serverUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000' 
          : `${window.location.protocol}//${window.location.host}`;
        const downloadUrl = `${serverUrl}/api/certificates/download/${certId}`;

        if (downloadMethod === 'zip') {
          zip.file(`${certId}.pdf`, pdfBlob);
        } else {
          saveAs(pdfBlob, `${certId}.pdf`);
        }

        res.push({ 
          name, 
          email, 
          certificateId: certId, 
          date,
          certificateLink: downloadUrl,
          status: 'success' 
        });
      } catch (err) {
        res.push({ name, email, certificateId: certId, date, status: 'failed', error: err.message });
      }

      // Pseudo progress bar for client-side
      setProgress(Math.round(((i + 1) / participants.length) * 100));
      setProgressCounter({ completed: i + 1, total: participants.length });
    }

    if (downloadMethod === 'zip' && res.filter(r => r.status === 'success').length > 0) {
      try {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'certificates.zip');
        toast.success('Downloaded ZIP containing all certificates!');
      } catch (zipErr) {
        toast.error(`ZIP generation failed: ${zipErr.message}`);
      }
    }

    setResults(res);
    const ok = res.filter(r => r.status === 'success').length;
    toast.success(`Generated ${ok} / ${res.length} certificates`);
    setProcessing(false);
  };

  const handleExportEnrichedCSV = () => {
    if (generateLocation === 'server' && serverJobId) {
      // Direct server export
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : `${window.location.protocol}//${window.location.host}`;
      window.open(`${serverUrl}/api/certificates/export/${serverJobId}`);
      toast.success('Exporting enriched spreadsheet from server...');
      return;
    }

    if (!results) return;
    const headers = ['Sr_no', 'Name', 'Email', 'Certificate_ID', 'Date', 'Certificate_Link'];
    
    const csvContent = [
      headers.join(','),
      ...results.map((r, i) => [
        i + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.email.replace(/"/g, '""')}"`,
        `"${r.certificateId.replace(/"/g, '""')}"`,
        `"${r.date.replace(/"/g, '""')}"`,
        `"${(r.certificateLink || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'enriched_participants_certificates.csv');
    toast.success('Downloaded Enriched spreadsheet!');
  };

  const handleDownloadZip = () => {
    if (generateLocation === 'server' && serverJobId) {
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : `${window.location.protocol}//${window.location.host}`;
      window.open(`${serverUrl}/api/certificates/download/zip/${serverJobId}`);
      toast.success('Downloading ZIP archive from server...');
    }
  };

  return (
    <div className="bulk-processor">
      <div className="processor-header">
        <h2>Generate Certificates</h2>
        <p>Configure custom ID generation rules, choose your preferred download layout, and process bulk participant spreadsheets.</p>
      </div>

      <div className="processor-layout">
        <div className="upload-section">
          <h3>Upload Participant List (CSV)</h3>
          <div {...getRootProps()} className={`excel-dropzone${isDragActive ? ' active' : ''}`}>
            <input {...getInputProps()} />
            {participants.length > 0
              ? <div className="file-selected"><div className="file-icon">✓</div><div className="file-info"><h4>{participants.length} participants loaded</h4></div></div>
              : <div className="upload-prompt"><div className="upload-icon">⊞</div><h4>{isDragActive ? 'Drop CSV here' : 'Drag & drop CSV'}</h4><p>or <span className="browse-text">browse</span></p></div>
            }
          </div>

          <div style={{background:'var(--secondary-background)',padding:16,borderRadius:8,marginTop:16}}>
            <h4 style={{margin:'0 0 12px',fontSize:14,color:'var(--text-primary)'}}>🛠 ID Generation & Download Rules</h4>
            
            {/* Custom Pattern Generator config */}
            <div className="form-group" style={{marginBottom:14}}>
              <label className="checkbox-label" style={{fontWeight:'600',cursor:'pointer'}}>
                <input 
                  type="checkbox" 
                  checked={generateCustomIds} 
                  onChange={e => setGenerateCustomIds(e.target.checked)} 
                  style={{marginRight:8}}
                />
                Generate Custom Certificate IDs
              </label>
            </div>

            {generateCustomIds && (
              <div className="form-group" style={{marginBottom:14}}>
                <label style={{fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:4}}>ID Template Format Pattern:</label>
                <input 
                  type="text" 
                  value={idPattern} 
                  onChange={e => setIdPattern(e.target.value)} 
                  className="form-control"
                  placeholder="e.g. SOU-{{name(0,3)}}-{{random_number(xxxxxx)}}"
                />
                <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4}}>
                  <small style={{color:'var(--text-secondary)',fontSize:11}}>
                    Presets (click to select):
                  </small>
                  <button 
                    onClick={() => setIdPattern('SOU-PYthon-{{random_number(xxxxxx)}}')} 
                    className="btn btn-secondary" 
                    style={{fontSize:11,padding:'2px 6px',justifyContent:'flex-start',textAlign:'left'}}
                  >
                    Preset 1: SOU-PYthon-{"{{random_number(xxxxxx)}}"}
                  </button>
                  <button 
                    onClick={() => setIdPattern('SOU-{{name(0,3)}}-{{random_number(xxxxxx)}}')} 
                    className="btn btn-secondary" 
                    style={{fontSize:11,padding:'2px 6px',justifyContent:'flex-start',textAlign:'left'}}
                  >
                    Preset 2: SOU-{"{{name(0,3)}}"}-{"{{random_number(xxxxxx)}}"}
                  </button>
                </div>
              </div>
            )}

            {/* Generate Location Option */}
            <div className="form-group" style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Processing Environment:</label>
              <div style={{display:'flex',gap:12}}>
                <label className="checkbox-label" style={{fontSize:13,cursor:'pointer'}}>
                  <input 
                    type="radio" 
                    name="generateLocation" 
                    value="server" 
                    checked={generateLocation === 'server'} 
                    onChange={() => setGenerateLocation('server')} 
                    style={{marginRight:6}}
                  />
                  Server-side Batch Queue (Fast & Scalable)
                </label>
                <label className="checkbox-label" style={{fontSize:13,cursor:'pointer'}}>
                  <input 
                    type="radio" 
                    name="generateLocation" 
                    value="browser" 
                    checked={generateLocation === 'browser'} 
                    onChange={() => setGenerateLocation('browser')} 
                    style={{marginRight:6}}
                  />
                  Client-side Browser (Offline)
                </label>
              </div>
            </div>

            {/* ZIP vs Separate select */}
            {generateLocation === 'browser' && (
              <div className="form-group" style={{marginBottom:0}}>
                <label style={{fontSize:12,color:'var(--text-secondary)',display:'block',marginBottom:6}}>Download Method Layout:</label>
                <div style={{display:'flex',gap:12}}>
                  <label className="checkbox-label" style={{fontSize:13,cursor:'pointer'}}>
                    <input 
                      type="radio" 
                      name="downloadMethod" 
                      value="zip" 
                      checked={downloadMethod === 'zip'} 
                      onChange={() => setDownloadMethod('zip')} 
                      style={{marginRight:6}}
                    />
                    Merged ZIP File (Recommended)
                  </label>
                  <label className="checkbox-label" style={{fontSize:13,cursor:'pointer'}}>
                    <input 
                      type="radio" 
                      name="downloadMethod" 
                      value="separate" 
                      checked={downloadMethod === 'separate'} 
                      onChange={() => setDownloadMethod('separate')} 
                      style={{marginRight:6}}
                    />
                    Separate Individual PDFs
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="process-section">
          <h3>Template: {template.name}</h3>
          {template.imageBase64 && <img src={template.imageBase64} alt="" style={{width:'100%',borderRadius:8,marginBottom:12,maxHeight:140,objectFit:'cover'}} />}
          
          <div className="template-summary">
            <h4 style={{margin:'0 0 8px'}}>Configured Fields</h4>
            {(fieldConfig.fieldsList || [
              { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
              { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
              { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
              { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
            ]).filter(f => fieldConfig[f.key]?.enabled).map(f => (
              <div key={f.key} className="summary-item">
                <label>{f.label}</label>
                <span>X:{fieldConfig[f.key]?.x || 0} Y:{fieldConfig[f.key]?.y || 0} {fieldConfig[f.key]?.fontSize || 24}px {fieldConfig[f.key]?.bold ? '(bold)' : ''}</span>
              </div>
            ))}
          </div>

          {processing && (
            <div className="progress-container" style={{background:'var(--secondary-background)',padding:16,borderRadius:8,marginTop:16,border:'1px solid var(--border-color)'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
                <strong style={{color:'var(--primary-blue)'}}>Processing Batch Job...</strong>
                <span>{progress}% ({progressCounter.completed} / {progressCounter.total})</span>
              </div>
              <div className="progress-bar-bg" style={{width:'100%',height:10,background:'rgba(0,0,0,0.1)',borderRadius:5,overflow:'hidden'}}>
                <div className="progress-bar-fill" style={{width:`${progress}%`,height:'100%',background:'linear-gradient(90deg, #3b82f6, #8b5cf6)',transition:'width 0.3s ease',boxShadow:'0 0 8px rgba(59, 130, 246, 0.5)'}}></div>
              </div>
              <small style={{display:'block',marginTop:8,color:'var(--text-secondary)',fontSize:11,textAlign:'center'}}>
                Yielding event loops, reading template, and registering custom fonts...
              </small>
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:16}}>
            <button onClick={generate} disabled={!participants.length || processing} className="btn btn-primary process-btn" style={{width:'100%'}}>
              {processing ? <><span className="spinner-small"></span>Generating…</> : `Generate ${participants.length || ''} Certificates`}
            </button>

            {results && (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={handleExportEnrichedCSV} className="btn btn-secondary" style={{width:'100%',justifyContent:'center'}}>
                  📊 Download Enriched CSV with Certificate Links
                </button>
                {generateLocation === 'server' && (
                  <button onClick={handleDownloadZip} className="btn btn-secondary" style={{width:'100%',justifyContent:'center'}}>
                    📦 Download Certificates ZIP Archive (Server)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {results && (
        <div className="results-section" style={{marginTop:24}}>
          <div className="results-header">
            <h3>Generation Activity Log</h3>
            <div className="results-summary">
              <span className="success-count" style={{color:'#16a34a',fontWeight:'600'}}>✓ {results.filter(r=>r.status==='success').length} Generated</span>
              <span className="failed-count" style={{color:'#dc2626',fontWeight:'600',marginLeft:12}}>✕ {results.filter(r=>r.status==='failed').length} Failed</span>
            </div>
          </div>
          <div className="results-table" style={{marginTop:12,background:'var(--secondary-background)',padding:12,borderRadius:8}}>
            <div className="table-header" style={{display:'grid',gridTemplateColumns:'60px 1.5fr 1.5fr 1fr',fontWeight:'600',borderBottom:'1px solid var(--border-color)',paddingBottom:6}}>
              <span>Status</span><span>Name</span><span>Certificate ID</span><span>Action</span>
            </div>
            <div style={{maxHeight:200,overflowY:'auto',marginTop:6}}>
              {results.map((r,i) => (
                <div key={i} className="table-row" style={{display:'grid',gridTemplateColumns:'60px 1.5fr 1.5fr 1fr',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                  <span style={{color: r.status==='success' ? '#16a34a' : '#dc2626'}}>{r.status==='success' ? '✓' : '✕'}</span>
                  <span>{r.name}</span>
                  <span style={{fontFamily:'monospace'}}>{r.certificateId}</span>
                  <span>
                    {r.status === 'success' && (
                      <a href={r.certificateLink} target="_blank" rel="noreferrer" style={{color:'var(--primary-blue)',fontSize:12,textDecoration:'none'}}>
                        Open Link
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="processor-actions" style={{marginTop:24}}>
        <button onClick={onBack} className="btn btn-secondary">← Back</button>
        {results && <button onClick={() => { setResults(null); setParticipants([]); setProgress(0); }} className="btn btn-secondary">Generate Another</button>}
      </div>
    </div>
  );
};

// ─── Client-side PDF builder using canvas ────────────────────────────────────
async function buildCertificatePDF(template, fieldConfig, data) {
  const { jsPDF } = await import('jspdf');

  const img = await loadImage(template.imageBase64);
  const W = img.width, H = img.height;

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

  const pdf = new jsPDF({ orientation: W > H ? 'landscape' : 'portrait', unit: 'px', format: [W, H] });
  pdf.addImage(template.imageBase64, format, 0, 0, W, H);

  const fieldsToDraw = fieldConfig.fieldsList || [
    { key: 'name',          label: '{{NAME}}',           color: '#2563eb' },
    { key: 'certificateId', label: '{{CERTIFICATE_ID}}', color: '#7c3aed' },
    { key: 'email',         label: '{{EMAIL}}',          color: '#059669' },
    { key: 'date',          label: '{{DATE}}',           color: '#d97706' },
  ];

  const fieldValues = {};
  fieldsToDraw.forEach(f => {
    const matchKey = Object.keys(data).find(k => k.toLowerCase().replace(/[^a-z0-9_]/g, '') === f.key.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    let val = matchKey ? data[matchKey] : '';
    if (!val) {
      if (f.key === 'name') val = data.name || '';
      else if (f.key === 'certificateId') val = data.certificateId || '';
      else if (f.key === 'email') val = data.email || '';
      else if (f.key === 'date') val = data.date || '';
    }
    fieldValues[f.key] = val;
  });

  const canvasW = fieldConfig.canvasWidth || 800;
  const canvasH = fieldConfig.canvasHeight || 600;
  const scaleX = W / canvasW;
  const scaleY = H / canvasH;
  const avgScale = (scaleX + scaleY) / 2;

  const mapFontFamily = (fontName) => {
    const name = (fontName || '').toLowerCase().trim();
    if (name.includes('times') || name.includes('georgia')) return 'times';
    if (name.includes('courier')) return 'courier';
    return 'helvetica';
  };

  fieldsToDraw.forEach(f => {
    const cfg = fieldConfig[f.key];
    if (!cfg || !cfg.enabled) return;
    const value = fieldValues[f.key] || '';
    
    const pdfX = cfg.x * scaleX;
    const pdfY = cfg.y * scaleY;
    const pdfFontSize = cfg.fontSize * avgScale;

    pdf.setFontSize(pdfFontSize);
    pdf.setFont(mapFontFamily(cfg.fontFamily), cfg.bold ? 'bold' : 'normal');
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
