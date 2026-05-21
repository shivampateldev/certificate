import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { templateAPI } from '../services/api';
import './TemplateUploader.css';

const TemplateUploader = ({ onTemplateUploaded, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['png', 'pdf', 'jpg', 'jpeg'].includes(ext)) {
      toast.error('Only PNG, PDF, JPG files are supported');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (['png', 'jpg', 'jpeg'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Auto-fill template name from filename
    if (!templateName) {
      const name = file.name.replace(/\.[^/.]+$/, '');
      setTemplateName(name);
    }
  }, [templateName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      setUploading(true);
      const response = await templateAPI.uploadTemplate(
        selectedFile,
        templateName.trim()
      );

      if (response.data.success) {
        toast.success('Template uploaded successfully!');
        if (onTemplateUploaded) {
          onTemplateUploaded(response.data.data);
        }
        // Reset form
        setSelectedFile(null);
        setTemplateName('');
        setPreview(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error?.message || error.message;
      toast.error(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="template-uploader">
      <div className="uploader-header">
        <h2>Upload Certificate Template</h2>
        <p>Upload a PNG, JPG, or PDF file to use as your certificate template</p>
      </div>

      <div className="uploader-content">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="file-selected">
              <div className="file-icon">✓</div>
              <div className="file-info">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">({(selectedFile.size / 1024).toFixed(2)} KB)</p>
              </div>
            </div>
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon">📄</div>
              <h3>{isDragActive ? 'Drop file here' : 'Drag & drop template file'}</h3>
              <p>or <span className="browse-link">browse</span></p>
              <p className="file-types">PNG, JPG, or PDF</p>
            </div>
          )}
        </div>

        {preview && (
          <div className="preview-section">
            <h3>Preview</h3>
            <img src={preview} alt="Template preview" className="preview-image" />
          </div>
        )}

        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Technical Certificate 2024"
            className="form-control"
          />
        </div>

        <div className="uploader-actions">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={!selectedFile || !templateName.trim() || uploading}
          >
            {uploading ? (
              <>
                <span className="spinner-small"></span>
                Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateUploader;
