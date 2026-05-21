import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ParticipantDataTable from '../components/ParticipantDataTable';
import BatchCreator from '../components/BatchCreator';
import './ParticipantManagement.css';

const ParticipantManagement = () => {
  const [showBatchCreator, setShowBatchCreator] = useState(false);
  const [participants, setParticipants] = useState([]);
  const navigate = useNavigate();

  const handleParticipantsReady = (data) => {
    // Handle when participants are ready for batch creation
    setParticipants(data.participants);
    setShowBatchCreator(true);
    toast.success('Ready to create batch!');
  };

  const handleBackToUpload = () => {
    setShowBatchCreator(false);
    setParticipants([]);
  };

  const handleBatchCreated = (batch) => {
    toast.success(`Batch "${batch.name}" created successfully!`);
    // Navigate to certificate generator with the new batch
    navigate('/generate', { 
      state: { 
        batchId: batch.id,
        batchName: batch.name 
      } 
    });
  };

  const handleCancelBatchCreation = () => {
    setShowBatchCreator(false);
  };

  return (
    <div className="participant-management">
      <div className="container">
        <header className="page-header">
          <h1>Participant Management</h1>
          <p>Upload and manage participant data for certificate generation</p>
        </header>
        
        <main className="management-content" role="main" aria-live="polite">
          {!showBatchCreator ? (
            <section aria-labelledby="participant-data-title">
              <h2 id="participant-data-title" className="sr-only">Participant Data Management</h2>
              <ParticipantDataTable 
                onParticipantsReady={handleParticipantsReady}
                onBack={handleBackToUpload}
              />
            </section>
          ) : (
            <section aria-labelledby="batch-creator-title">
              <h2 id="batch-creator-title" className="sr-only">Batch Creation</h2>
              <BatchCreator
                participants={participants}
                onBatchCreated={handleBatchCreated}
                onCancel={handleCancelBatchCreation}
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default ParticipantManagement;