import { useState, useEffect } from 'react';
import { getWorkParts, updateWorkPart, reviewWorkPart, uploadWorkFile, getWorkFiles, deleteWorkFile } from '../api/client';
import { StatusBadge } from './UI';

const WorkPartStatus = {
  NOT_STARTED: { color: '#6b7280', label: 'Not Started' },
  IN_PROGRESS: { color: '#3b82f6', label: 'In Progress' },
  SUBMITTED: { color: '#f59e0b', label: 'Submitted' },
  APPROVED: { color: '#10b981', label: 'Approved' },
  REVISION_REQUIRED: { color: '#ef4444', label: 'Revision Required' },
};

export default function WorkProgress({ taskId, user }) {
  const [workParts, setWorkParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedPart, setExpandedPart] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({});

  const isClient = user.role === 'CLIENT';
  const isFreelancer = user.role === 'FREELANCER';

  useEffect(() => {
    fetchWorkParts();
  }, [taskId]);

  const fetchWorkParts = async () => {
    try {
      const res = await getWorkParts(taskId);
      setWorkParts(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch work parts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (workPartId, status, content = null) => {
    try {
      setError('');
      setSuccess('');
      
      const updateData = { status };
      if (content) updateData.content = content;
      
      await updateWorkPart(workPartId, updateData);
      setSuccess('Work part updated successfully!');
      fetchWorkParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update work part');
    }
  };

  const handleReview = async (workPartId, status, feedback = '') => {
    try {
      setError('');
      setSuccess('');
      
      await reviewWorkPart(workPartId, { status, feedback });
      setSuccess('Review submitted successfully!');
      fetchWorkParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleFileUpload = async (workPartId, file) => {
    try {
      setError('');
      setUploadingFiles(prev => ({ ...prev, [workPartId]: true }));
      
      await uploadWorkFile(workPartId, file);
      setSuccess('File uploaded successfully!');
      fetchWorkParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [workPartId]: false }));
    }
  };

  const handleFileDelete = async (workPartId, fileId) => {
    try {
      setError('');
      await deleteWorkFile(workPartId, fileId);
      setSuccess('File deleted successfully!');
      fetchWorkParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  if (loading) return <div>Loading work progress...</div>;

  const completedParts = workParts.filter(part => part.status === 'APPROVED').length;
  const totalParts = workParts.length;
  const progressPercentage = totalParts > 0 ? (completedParts / totalParts) * 100 : 0;

  return (
    <div className="work-progress">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Progress Overview */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Work Progress</h3>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Overall Progress</span>
            <span>{completedParts}/{totalParts} parts completed</span>
          </div>
          <div style={{ 
            height: 8, 
            backgroundColor: '#e5e7eb', 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progressPercentage}%`, 
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Work Parts */}
      {workParts.map((part) => (
        <div key={part.id} className="card" style={{ marginBottom: 16 }}>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setExpandedPart(expandedPart === part.id ? null : part.id)}
          >
            <div>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Part {part.partNumber}: {part.title}</span>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: 4, 
                  fontSize: '0.75rem',
                  backgroundColor: WorkPartStatus[part.status].color + '20',
                  color: WorkPartStatus[part.status].color
                }}>
                  {WorkPartStatus[part.status].label}
                </span>
              </h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {part.description}
              </p>
            </div>
            <span style={{ fontSize: '1.2rem' }}>
              {expandedPart === part.id ? '▼' : '▶'}
            </span>
          </div>

          {expandedPart === part.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              {/* Freelancer Content */}
              {part.content && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ marginBottom: 8 }}>Work Update:</h5>
                  <p style={{ 
                    padding: 12, 
                    backgroundColor: '#f9fafb', 
                    borderRadius: 6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {part.content}
                  </p>
                </div>
              )}

              {/* Client Feedback */}
              {part.feedback && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ marginBottom: 8 }}>Client Feedback:</h5>
                  <p style={{ 
                    padding: 12, 
                    backgroundColor: '#fef2f2', 
                    borderRadius: 6,
                    borderLeft: '4px solid #ef4444'
                  }}>
                    {part.feedback}
                  </p>
                </div>
              )}

              {/* Files */}
              {part.files && part.files.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ marginBottom: 8 }}>Files:</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {part.files.map((file) => (
                      <div key={file.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: 8,
                        backgroundColor: '#f9fafb',
                        borderRadius: 6
                      }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{file.filename}</span>
                          <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        {isFreelancer && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleFileDelete(part.id, file.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Freelancer Actions */}
              {isFreelancer && part.status !== 'APPROVED' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {part.status === 'NOT_STARTED' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusUpdate(part.id, 'IN_PROGRESS')}
                    >
                      Start Work
                    </button>
                  )}
                  
                  {part.status === 'IN_PROGRESS' && (
                    <>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}
                      >
                        Submit for Review
                      </button>
                      <label className="btn btn-secondary btn-sm" style={{ margin: 0 }}>
                        📎 Upload File
                        <input
                          type="file"
                          hidden
                          onChange={(e) => e.target.files[0] && handleFileUpload(part.id, e.target.files[0])}
                          disabled={uploadingFiles[part.id]}
                        />
                      </label>
                    </>
                  )}
                  
                  {part.status === 'REVISION_REQUIRED' && (
                    <>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}
                      >
                        Resubmit
                      </button>
                      <label className="btn btn-secondary btn-sm" style={{ margin: 0 }}>
                        📎 Upload File
                        <input
                          type="file"
                          hidden
                          onChange={(e) => e.target.files[0] && handleFileUpload(part.id, e.target.files[0])}
                          disabled={uploadingFiles[part.id]}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Client Actions */}
              {isClient && part.status === 'SUBMITTED' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleReview(part.id, 'APPROVED')}
                  >
                    ✅ Approve
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      const feedback = prompt('Please provide feedback for revision:');
                      if (feedback) handleReview(part.id, 'REVISION_REQUIRED', feedback);
                    }}
                  >
                    🔄 Request Revision
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
