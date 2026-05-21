import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { participantAPI } from '../services/api';
import MaterialTable from './MaterialTable';
import EmptyState from './EmptyState';
import './ParticipantDataTable.css';

const ParticipantDataTable = ({ onParticipantsReady, onBack }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'srNo', direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setErrors([]);

    try {
      const response = await participantAPI.uploadParticipantFile(file);
      
      if (response.data.success) {
        // Backend returns fileData (full list) or preview — not 'participants'
        const loaded = response.data.data.fileData || response.data.data.preview || [];
        setParticipants(loaded);
        setSelectedParticipants(new Set()); // Clear selections when new data is loaded
        
        if (response.data.data.errors && response.data.data.errors.length > 0) {
          setErrors(response.data.data.errors);
          toast.success(`File processed with ${response.data.data.errors.length} validation errors`);
        } else {
          toast.success('File processed successfully!');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to process file';
      toast.error(errorMessage);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
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
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtering functionality
  const filteredParticipants = useMemo(() => {
    if (!Array.isArray(participants)) return [];
    if (!filterText) return participants;
    
    return participants.filter(participant =>
      (participant.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (participant.email || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (participant.certificateId || '').toLowerCase().includes(filterText.toLowerCase())
    );
  }, [participants, filterText]);

  // Sorted participants
  const sortedParticipants = useMemo(() => {
    if (!Array.isArray(filteredParticipants)) return [];
    const sorted = [...filteredParticipants].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredParticipants, sortConfig]);

  // Inline editing functionality
  const handleCellEdit = (participantIndex, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      [field]: value
    };
    setParticipants(updatedParticipants);
  };

  const handleCellBlur = async (participantIndex, field, value) => {
    setEditingCell(null);
    
    const participant = participants[participantIndex];
    const originalValue = participant[field];
    
    // Validate email format if editing email field
    if (field === 'email' && value && !isValidEmail(value)) {
      toast.error('Please enter a valid email address');
      // Revert the change
      const revertedParticipants = [...participants];
      revertedParticipants[participantIndex][field] = originalValue;
      setParticipants(revertedParticipants);
      return;
    }
    
    // Validate name field is not empty
    if (field === 'name' && !value.trim()) {
      toast.error('Name cannot be empty');
      // Revert the change
      const revertedParticipants = [...participants];
      revertedParticipants[participantIndex][field] = originalValue;
      setParticipants(revertedParticipants);
      return;
    }
    
    // Only update if value changed and participant has an ID (saved to database)
    if (participant.id && originalValue !== value) {
      try {
        await participantAPI.updateParticipant(participant.id, { [field]: value });
        toast.success('Participant updated successfully');
      } catch (error) {
        toast.error('Failed to update participant');
        // Revert the change
        const revertedParticipants = [...participants];
        revertedParticipants[participantIndex][field] = originalValue;
        setParticipants(revertedParticipants);
      }
    }
  };

  // Email validation helper
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Export functionality
  const handleExportCSV = async () => {
    if (participants.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (!batchId) {
      // Export current data as CSV
      const csvContent = generateCSVContent(filteredParticipants);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(blob, `participants-${timestamp}.csv`);
      toast.success('CSV exported successfully');
      return;
    }

    try {
      const response = await participantAPI.exportParticipantsCSV(batchId);
      saveAs(response.data, `participants-batch-${batchId}.csv`);
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    if (participants.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (!batchId) {
      // For unsaved data, export as CSV with Excel-compatible format
      const csvContent = generateCSVContent(filteredParticipants);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(blob, `participants-${timestamp}.csv`);
      toast.success('Data exported as CSV (Excel-compatible format)');
      return;
    }

    try {
      const response = await participantAPI.exportParticipantsExcel(batchId);
      saveAs(response.data, `participants-batch-${batchId}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  // Generate CSV content for client-side export
  const generateCSVContent = (data) => {
    const headers = ['Sr_no', 'Name', 'Email', 'Certificate_ID'];
    const csvRows = [headers.join(',')];
    
    data.forEach(participant => {
      const row = [
        participant.srNo || '',
        `"${(participant.name || '').replace(/"/g, '""')}"`, // Escape quotes in names
        participant.email || '',
        participant.certificateId || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return '\uFEFF' + csvRows.join('\r\n'); // Add BOM for Excel compatibility
  };

  // Proceed to batch creation
  const handleProceedToBatch = () => {
    if (participants.length === 0) {
      toast.error('No participants to create batch with');
      return;
    }

    // Notify parent component that participants are ready for batch creation
    if (onParticipantsReady) {
      onParticipantsReady({
        participants
      });
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="participant-data-table">

      {participants.length === 0 ? (
        <div className="uploader-container">
          <div
            {...getRootProps()}
            className={`file-dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Processing file...</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">⊞</div>
                <h3>
                  {isDragActive ? 'Drop your file here' : 'Upload Participant Data'}
                </h3>
                <p>Drag & drop a CSV or Excel file, or <span className="browse-text">browse files</span></p>
                <div className="supported-formats">
                  <span>Supported: CSV, XLSX, XLS (Max 10MB)</span>
                </div>
              </div>
            )}
          </div>

          <div className="format-info">
            <h4>Required File Format</h4>
            <div className="format-example">
              <div className="example-table">
                <div className="example-header">
                  <span>Sr_no</span>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Certificate_ID</span>
                </div>
                <div className="example-row">
                  <span>1</span>
                  <span>John Doe</span>
                  <span>john@example.com</span>
                  <span>SOU-20241024-001-00001</span>
                </div>
                <div className="example-row">
                  <span>2</span>
                  <span>Jane Smith</span>
                  <span>jane@example.com</span>
                  <span>SOU-20241024-001-00002</span>
                </div>
              </div>
              <div className="format-notes">
                <p><strong>Notes:</strong></p>
                <ul>
                  <li>Sr_no and Certificate_ID are optional - they will be auto-generated if not provided</li>
                  <li>Name and Email are required fields</li>
                  <li>Email addresses must be valid format</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-section">
          <div className="table-controls">
            <div className="controls-left">
              <input
                type="text"
                placeholder="Filter participants..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
              />
              <span className="participant-count">
                {filteredParticipants.length} of {participants.length} participants
              </span>
            </div>
            
            <div className="controls-right">
              {selectedParticipants.size > 0 && (
                <div className="bulk-actions">
                  <span className="selected-count">
                    {selectedParticipants.size} selected
                  </span>
                  <button
                    onClick={() => {
                      const selectedData = Array.from(selectedParticipants).map(index => sortedParticipants[index]);
                      const csvContent = generateCSVContent(selectedData);
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const timestamp = new Date().toISOString().split('T')[0];
                      saveAs(blob, `selected-participants-${timestamp}.csv`);
                      toast.success('Selected participants exported');
                    }}
                    className="btn btn-sm btn-secondary"
                    title="Export selected as CSV"
                  >
                    Export Selected
                  </button>
                </div>
              )}
              <button
                onClick={handleExportCSV}
                className="btn btn-secondary"
                title="Export all as CSV"
              >
                CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="btn btn-secondary"
                title="Export all as Excel"
              >
                Excel
              </button>
              <button
                onClick={handleProceedToBatch}
                disabled={loading}
                className="btn btn-primary"
              >
                Create Batch
              </button>
            </div>
          </div>

          <MaterialTable
            columns={[
              {
                key: 'srNo',
                title: 'Sr No',
                width: '80px',
                align: 'center'
              },
              {
                key: 'name',
                title: 'Name',
                render: (value, row, index) => (
                  editingCell === `${index}-name` ? (
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => handleCellEdit(index, 'name', e.target.value)}
                      onBlur={(e) => handleCellBlur(index, 'name', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          const originalParticipant = participants.find(p => p.certificateId === row.certificateId);
                          if (originalParticipant) {
                            handleCellEdit(index, 'name', originalParticipant.name);
                          }
                          setEditingCell(null);
                        }
                      }}
                      autoFocus
                      className="cell-input"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${index}-name`)}
                      className="editable-cell"
                      title="Click to edit"
                    >
                      {row.name}
                    </span>
                  )
                )
              },
              {
                key: 'email',
                title: 'Email',
                render: (value, row, index) => (
                  editingCell === `${index}-email` ? (
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => handleCellEdit(index, 'email', e.target.value)}
                      onBlur={(e) => handleCellBlur(index, 'email', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          const originalParticipant = participants.find(p => p.certificateId === row.certificateId);
                          if (originalParticipant) {
                            handleCellEdit(index, 'email', originalParticipant.email);
                          }
                          setEditingCell(null);
                        }
                      }}
                      autoFocus
                      className="cell-input"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingCell(`${index}-email`)}
                      className="editable-cell"
                      title="Click to edit"
                    >
                      {row.email}
                    </span>
                  )
                )
              },
              {
                key: 'certificateId',
                title: 'Certificate ID',
                render: (value) => (
                  <span className="certificate-id">{value}</span>
                )
              }
            ]}
            data={sortedParticipants}
            selectable={true}
            hoverable={true}
            sortable={true}
            onRowSelect={(selectedIndexes) => {
              setSelectedParticipants(new Set(selectedIndexes));
            }}
            onSort={(sortConfig) => {
              setSortConfig(sortConfig);
            }}
            emptyState={
              <EmptyState
                icon=""
                title="No participants found"
                description="Upload a file or adjust your filters to see participant data."
              />
            }
            className="elevation-2"
          />

          {errors.length > 0 && (
            <div className="validation-errors">
              <h4>Validation Errors</h4>
              <div className="error-list">
                {errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <strong>Row {error.row}:</strong>
                    <ul>
                      {error.errors.map((err, errIndex) => (
                        <li key={errIndex}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="table-actions">
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            ← Back
          </button>
        )}
        
        {participants.length > 0 && (
          <button
            onClick={() => {
              setParticipants([]);
              setErrors([]);
              setBatchId(null);
              setFilterText('');
              setSelectedParticipants(new Set());
            }}
            className="btn btn-secondary"
          >
            Upload New File
          </button>
        )}
      </div>
    </div>
  );
};

export default ParticipantDataTable;