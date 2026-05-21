import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import './ExportButton.css';

const ExportButton = ({ reportType, filters, label = "Export Data" }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const exportData = async (format) => {
    setIsExporting(true);
    setShowOptions(false);

    try {
      const response = await api.post('/reports/export', { reportType, format, filters }, { responseType: 'blob' });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} export completed successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()} file`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-button-container">
      <button
        className="export-button"
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting}
      >
        {isExporting ? (
          <><span className="spinner"></span>Exporting...</>
        ) : (
          <>📥 {label}</>
        )}
      </button>

      {showOptions && (
        <div className="export-options">
          <button className="export-option" onClick={() => exportData('csv')} disabled={isExporting}>
            📄 Export as CSV
          </button>
          <button className="export-option" onClick={() => exportData('xlsx')} disabled={isExporting}>
            📊 Export as Excel
          </button>
          <button className="export-option" onClick={() => exportData('json')} disabled={isExporting}>
            📋 Export as JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
