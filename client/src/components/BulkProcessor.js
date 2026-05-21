import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { certificateAPI } from '../services/api';
import './BulkProcessor.css';

const BulkProcessor = ({ templateData, textConfig, onBack }) => {
  const navigate = useNavigate();
  const [excelFile, setExcelFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setExcelFile(file);
      toast.success('Excel file loaded successfully!');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const processExcelFile = async () => {
    if (!excelFile) {
      toast.error('Please upload an Excel file first');
      return;
    }

    setProcessing(true);

    try {
      const response = await certificateAPI.generateBulk(
        excelFile,
        templateData.templatePath,
        textConfig
      );

      setResults(response.data.results);
      toast.success(`Generated ${response.data.results.filter(r => r.status === 'success').length} certificates!`);
    } catch (error) {
      toast.error(`Processing failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadCertificate = async (certificatePath, name, certificateId) => {
    try {
      const response = await certificateAPI.downloadCertificate(certificatePath);
      // Use Certificate ID as filename, fallback to name
      const filename = certificateId ? `${certificateId}.pdf` : `certificate-${name}.pdf`;
      saveAs(response.data, filename);
      toast.success(`Downloaded certificate for ${name}`);
    } catch (error) {
      toast.error(`Download failed for ${name}`);
    }
  };

  const downloadAllCertificates = async () => {
    if (!results) return;

    setDownloadingAll(true);
    const successfulResults = results.filter(r => r.status === 'success');
    
    try {
      const certificates = successfulResults.map(r => ({
        name: r.name,
        certificateId: r.certificateId,
        localPath: r.localPath || r.certificatePath,
        cloudUrl: r.cloudUrl
      }));

      const response = await certificateAPI.downloadCertificatesZip(certificates);

      // Create download link for ZIP file
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'certificates.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('All certificates downloaded as ZIP file!');
    } catch (error) {
      toast.error('ZIP download failed');
    } finally {
      setDownloadingAll(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✕';
      default: return '...';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'failed': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <div className="bulk-processor">
      <div className="processor-header">
        <h2>Generate Certificates in Bulk</h2>
        <p>Upload an Excel file with recipient data to generate multiple certificates</p>
      </div>

      <div className="processor-layout">
        <div className="upload-section">
          <h3>Step 1: Upload Excel File</h3>
          
          <div
            {...getRootProps()}
            className={`excel-dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            
            {excelFile ? (
              <div className="file-selected">
                <div className="file-icon">⧠</div>
                <div className="file-info">
                  <h4>{excelFile.name}</h4>
                  <p>{(excelFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="file-status">✓ Ready</div>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">⊞</div>
                <h4>
                  {isDragActive ? 'Drop your Excel file here' : 'Drag & drop Excel file'}
                </h4>
                <p>or <span className="browse-text">browse files</span></p>
                <div className="supported-formats">
                  <span>Supported: XLSX, XLS, CSV</span>
                </div>
              </div>
            )}
          </div>

          <div className="excel-format-info">
            <h4>Required Excel Format</h4>
            <div className="format-table">
              <div className="table-header">
                <span>Sr_no</span>
                <span>Name</span>
                <span>Email</span>
                <span>Certificate_ID</span>
                <span>Category</span>
              </div>
              <div className="table-row">
                <span>1</span>
                <span>John Doe</span>
                <span>john@example.com</span>
                <span>CERT-001</span>
                <span>Technical</span>
              </div>
              <div className="table-row">
                <span>2</span>
                <span>Jane Smith</span>
                <span>jane@example.com</span>
                <span>CERT-002</span>
                <span>Non-Technical</span>
              </div>
            </div>
            <div className="category-info">
              <p><strong>Categories:</strong> Technical, Non-Technical, Administrative, Spiritual</p>
              <p><em>Note: Category column is optional. Defaults to "Technical" if not provided.</em></p>
            </div>
          </div>
        </div>

        <div className="process-section">
          <h3>Step 2: Generate Certificates</h3>
          
          <div className="template-summary">
            <h4>Template Configuration</h4>
            <div className="summary-item">
              <label>Template:</label>
              <span>{templateData?.originalName}</span>
            </div>
            <div className="summary-item">
              <label>Name Position:</label>
              <span>Y: {textConfig.name.y} (Auto-centered horizontally)</span>
            </div>
            <div className="summary-item">
              <label>ID Position:</label>
              <span>X: {textConfig.certificateId.x}, Y: {textConfig.certificateId.y}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={processExcelFile}
            disabled={!excelFile || processing}
            className="btn btn-primary process-btn"
          >
            {processing ? (
              <>
                <div className="spinner-small"></div>
                Processing...
              </>
            ) : (
              'Generate All Certificates'
            )}
          </button>
        </div>
      </div>

      {results && (
        <div className="results-section">
          <div className="results-header">
            <h3>Generation Results</h3>
            <div className="results-summary">
              <span className="success-count">
                ✓ {results.filter(r => r.status === 'success').length} Successful
              </span>
              <span className="failed-count">
                ✕ {results.filter(r => r.status === 'failed').length} Failed
              </span>
            </div>
            {results.some(r => r.status === 'success') && (
              <button
                type="button"
                onClick={downloadAllCertificates}
                disabled={downloadingAll}
                className="btn btn-success download-all-btn"
              >
                {downloadingAll ? 'Downloading...' : 'Download All Certificates'}
              </button>
            )}
          </div>

          <div className="results-table">
            <div className="table-header">
              <span>Status</span>
              <span>Name</span>
              <span>Certificate ID</span>
              <span>Category</span>
              <span>Storage</span>
              <span>Action</span>
            </div>
            
            {results.map((result, index) => (
              <div key={index} className="table-row">
                <span className="status-cell">
                  <span 
                    className="status-icon"
                    style={{ color: getStatusColor(result.status) }}
                  >
                    {getStatusIcon(result.status)}
                  </span>
                </span>
                <span>{result.name}</span>
                <span>{result.certificateId}</span>
                <span>
                  <span className={`category-badge ${result.category?.toLowerCase().replace('-', '') || 'technical'}`}>
                    {result.category || 'Technical'}
                  </span>
                </span>
                <span className="storage-cell">
                  <span className="local-badge">Local</span>
                  {result.cloudUrl && <span className="cloud-badge">Cloud</span>}
                </span>
                <span className="action-cell">
                  {result.status === 'success' ? (
                    <button
                      type="button"
                      onClick={() => downloadCertificate(result.localPath || result.certificatePath, result.name, result.certificateId)}
                      className="btn-small btn-download"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="error-text">{result.error}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="processor-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back to Text Editor
        </button>
        {results && (
          <div className="additional-actions">
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setExcelFile(null);
              }}
              className="btn btn-secondary"
            >
              Process Another File
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="btn btn-primary"
            >
              View Reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkProcessor;