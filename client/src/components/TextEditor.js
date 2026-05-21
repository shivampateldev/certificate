import React, { useState, useRef, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import toast from 'react-hot-toast';
import './TextEditor.css';

const TextEditor = ({ templateData, textConfig, onSave, onBack }) => {
  const [config, setConfig] = useState(textConfig);
  const [selectedElement, setSelectedElement] = useState('name');
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [previewData, setPreviewData] = useState({
    name: 'John Doe',
    certificateId: 'CERT-2024-001'
  });
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
    'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'
  ];

  useEffect(() => {
    if (templateData && canvasRef.current) {
      loadTemplate();
    }
  }, [templateData]);

  const loadTemplate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (templateData.type === 'application/pdf') {
      // For PDF, show a placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PDF Template Preview', canvas.width / 2, canvas.height / 2);
      ctx.font = '16px Arial';
      ctx.fillText('(Text positioning will be applied to actual PDF)', canvas.width / 2, canvas.height / 2 + 30);
    } else {
      // For images, load and draw
      const img = new Image();
      img.onload = () => {
        // Calculate canvas size to maintain aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        setCanvasSize({ width, height });
        
        ctx.drawImage(img, 0, 0, width, height);
        drawTextElements();
      };
      img.src = templateData.preview;
    }
  };

  const calculateOptimalFontSize = (text, maxWidth, baseFontSize, fontFamily, bold, italic) => {
    const canvas = canvasRef.current;
    if (!canvas) return baseFontSize;
    
    const ctx = canvas.getContext('2d');
    let fontSize = baseFontSize;
    
    // Test different font sizes to find the optimal one
    for (let size = baseFontSize; size >= 12; size -= 2) {
      ctx.font = `${bold ? 'bold' : 'normal'} ${italic ? 'italic' : 'normal'} ${size}px ${fontFamily}`;
      const textWidth = ctx.measureText(text).width;
      
      if (textWidth <= maxWidth) {
        fontSize = size;
        break;
      }
    }
    
    return fontSize;
  };

  const drawTextElements = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calculate maximum width for text (80% of canvas width for padding)
    const maxTextWidth = canvas.width * 0.8;
    
    // Draw name with automatic horizontal centering and scaling
    const nameConfig = config.name;
    const optimalNameFontSize = calculateOptimalFontSize(
      previewData.name, 
      maxTextWidth, 
      nameConfig.fontSize, 
      nameConfig.fontFamily, 
      nameConfig.bold, 
      nameConfig.italic
    );
    
    ctx.font = `${nameConfig.bold ? 'bold' : 'normal'} ${nameConfig.italic ? 'italic' : 'normal'} ${optimalNameFontSize}px ${nameConfig.fontFamily}`;
    ctx.fillStyle = `rgb(${nameConfig.color.r}, ${nameConfig.color.g}, ${nameConfig.color.b})`;
    
    // Calculate centered X position for name
    const nameWidth = ctx.measureText(previewData.name).width;
    const nameCenteredX = (canvas.width - nameWidth) / 2;
    ctx.fillText(previewData.name, nameCenteredX, nameConfig.y);
    
    // Draw certificate ID with manual positioning (no auto-centering)
    const idConfig = config.certificateId;
    ctx.font = `${idConfig.bold ? 'bold' : 'normal'} ${idConfig.italic ? 'italic' : 'normal'} ${idConfig.fontSize}px ${idConfig.fontFamily}`;
    ctx.fillStyle = `rgb(${idConfig.color.r}, ${idConfig.color.g}, ${idConfig.color.b})`;
    
    // Use manual X and Y positioning for certificate ID
    ctx.fillText(previewData.certificateId, idConfig.x, idConfig.y);
    
    // Draw selection indicators
    if (selectedElement === 'name') {
      drawSelectionBox(nameCenteredX, nameConfig.y, nameWidth, optimalNameFontSize);
    } else if (selectedElement === 'certificateId') {
      const idWidth = ctx.measureText(previewData.certificateId).width;
      drawSelectionBox(idConfig.x, idConfig.y, idWidth, idConfig.fontSize);
    }
  };

  const drawSelectionBox = (x, y, width, height) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 5, y - height - 5, width + 10, height + 10);
    ctx.setLineDash([]);
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedElement === 'name') {
      // For name: only update Y position (X is auto-centered)
      setConfig(prev => ({
        ...prev,
        [selectedElement]: {
          ...prev[selectedElement],
          y: Math.round(y)
        }
      }));
    } else if (selectedElement === 'certificateId') {
      // For certificate ID: update both X and Y positions
      setConfig(prev => ({
        ...prev,
        [selectedElement]: {
          ...prev[selectedElement],
          x: Math.round(x),
          y: Math.round(y)
        }
      }));
    }
  };

  const updateConfig = (element, property, value) => {
    setConfig(prev => ({
      ...prev,
      [element]: {
        ...prev[element],
        [property]: value
      }
    }));
  };

  const handleColorChange = (color) => {
    if (showColorPicker) {
      updateConfig(showColorPicker, 'color', color.rgb);
    }
  };

  const handleSave = () => {
    // Include canvas dimensions in the config for proper scaling
    const configWithDimensions = {
      ...config,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height
    };
    onSave(configWithDimensions);
    toast.success('Text configuration saved!');
  };

  useEffect(() => {
    if (canvasRef.current) {
      loadTemplate();
    }
  }, [config, selectedElement, previewData]);

  return (
    <div className="text-editor">
      <div className="editor-header">
        <h2>Configure Text Elements</h2>
        <p>Click on the template to position text elements, then customize their appearance</p>
      </div>

      <div className="editor-layout">
        <div className="canvas-section">
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onClick={handleCanvasClick}
              className="template-canvas"
            />
            <div className="canvas-instructions">
              <p>
                {selectedElement === 'name' 
                  ? 'Click on the template to set the vertical position of the participant name'
                  : 'Click on the template to position the certificate ID anywhere on the template'
                }
              </p>
              <p>Currently editing: <strong>{selectedElement === 'name' ? 'Name' : 'Certificate ID'}</strong></p>
              <p>Canvas size: {canvasSize.width} × {canvasSize.height}</p>
              <p>
                {selectedElement === 'name' 
                  ? `Vertical position: Y: ${config[selectedElement].y}`
                  : `Position: X: ${config[selectedElement].x}, Y: ${config[selectedElement].y}`
                }
              </p>
              <p>
                <em>
                  {selectedElement === 'name' 
                    ? 'Name is automatically centered horizontally and scaled to fit within bounds'
                    : 'Certificate ID uses manual positioning - you control both X and Y coordinates'
                  }
                </em>
              </p>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="element-selector">
            <h3>Select Element to Edit</h3>
            <div className="element-buttons">
              <button
                className={`element-btn ${selectedElement === 'name' ? 'active' : ''}`}
                onClick={() => setSelectedElement('name')}
              >
                Name
              </button>
              <button
                className={`element-btn ${selectedElement === 'certificateId' ? 'active' : ''}`}
                onClick={() => setSelectedElement('certificateId')}
              >
                Certificate ID
              </button>
            </div>
          </div>

          <div className="preview-data">
            <h3>Preview Data</h3>
            <div className="form-group">
              <label>Sample Name:</label>
              <input
                type="text"
                value={previewData.name}
                onChange={(e) => setPreviewData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Sample Certificate ID:</label>
              <input
                type="text"
                value={previewData.certificateId}
                onChange={(e) => setPreviewData(prev => ({ ...prev, certificateId: e.target.value }))}
                className="form-control"
              />
            </div>
          </div>

          <div className="text-properties">
            <h3>Text Properties</h3>
            
            <div className="form-group">
              <label>
                {selectedElement === 'name' ? 'Vertical Position (Y)' : 'Position (X, Y)'}
              </label>
              <div className="position-inputs">
                {selectedElement === 'certificateId' && (
                  <input
                    type="number"
                    placeholder="X Position"
                    value={config[selectedElement].x}
                    onChange={(e) => updateConfig(selectedElement, 'x', parseInt(e.target.value) || 0)}
                    className="form-control"
                  />
                )}
                <input
                  type="number"
                  placeholder="Y Position"
                  value={config[selectedElement].y}
                  onChange={(e) => updateConfig(selectedElement, 'y', parseInt(e.target.value) || 0)}
                  className="form-control"
                />
              </div>
              <div className="position-help">
                <small>
                  {selectedElement === 'name' 
                    ? 'Name is automatically centered horizontally. Only adjust vertical position.'
                    : 'Certificate ID can be positioned anywhere. Adjust both horizontal and vertical position.'
                  }
                </small>
              </div>
            </div>

            <div className="form-group">
              <label>Font Family</label>
              <select
                value={config[selectedElement].fontFamily}
                onChange={(e) => updateConfig(selectedElement, 'fontFamily', e.target.value)}
                className="form-control"
              >
                {fontFamilies.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Font Size</label>
              <input
                type="range"
                min="12"
                max="72"
                value={config[selectedElement].fontSize}
                onChange={(e) => updateConfig(selectedElement, 'fontSize', parseInt(e.target.value))}
                className="font-size-slider"
              />
              <span className="font-size-value">{config[selectedElement].fontSize}px</span>
            </div>

            <div className="form-group">
              <label>Text Color</label>
              <div
                className="color-preview"
                onClick={() => setShowColorPicker(showColorPicker === selectedElement ? null : selectedElement)}
                style={{
                  backgroundColor: `rgb(${config[selectedElement].color.r}, ${config[selectedElement].color.g}, ${config[selectedElement].color.b})`
                }}
              />
              {showColorPicker === selectedElement && (
                <div className="color-picker-popup">
                  <ChromePicker
                    color={config[selectedElement].color}
                    onChange={handleColorChange}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Text Style</label>
              <div className="style-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config[selectedElement].bold}
                    onChange={(e) => updateConfig(selectedElement, 'bold', e.target.checked)}
                  />
                  Bold
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config[selectedElement].italic}
                    onChange={(e) => updateConfig(selectedElement, 'italic', e.target.checked)}
                  />
                  Italic
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="editor-actions">
        <button onClick={onBack} className="btn btn-secondary">
          Back to Template
        </button>
        <button onClick={handleSave} className="btn btn-primary">
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default TextEditor;