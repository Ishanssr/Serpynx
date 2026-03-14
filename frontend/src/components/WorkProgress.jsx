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
      console.log('Fetching work parts for task:', taskId);
      const res = await getWorkParts(taskId);
      console.log('Work parts fetched:', res.data);
      setWorkParts(res.data);
    } catch (err) {
      console.error('Failed to fetch work parts:', err);
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
      
      console.log('Uploading file:', file.name, 'to work part:', workPartId);
      
      await uploadWorkFile(workPartId, file);
      
      console.log('File uploaded successfully, fetching work parts...');
      setSuccess('File uploaded successfully!');
      fetchWorkParts();
    } catch (err) {
      console.error('File upload error:', err);
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

  // Show message when no work parts exist yet
  if (workParts.length === 0) {
    return (
      <div className="work-progress">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Work Parts Not Yet Created</h3>
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
            {isFreelancer 
              ? "Work parts are needed to track your progress. Click the button below to create them now."
              : "Work parts will be visible once the freelancer starts working."
            }
          </p>
          {isFreelancer && (
            <button 
              className="btn btn-primary"
              onClick={async () => {
                try {
                  setError('');
                  setSuccess('');
                  const res = await fetch(`/api/tasks/${taskId}/create-work-parts`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  const data = await res.json();
                  setSuccess(data.message || 'Work parts created successfully!');
                  setTimeout(() => window.location.reload(), 2000);
                } catch (err) {
                  setError('Failed to create work parts');
                }
              }}
              style={{ marginBottom: 16 }}
            >
              Create Work Parts Now
            </button>
          )}
        </div>
      </div>
    );
  }

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
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)'
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
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--danger)',
                    color: 'var(--text-primary)'
                  }}>
                    {part.feedback}
                  </p>
                </div>
              )}

              {/* Files */}
              <div style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 8 }}>Files:</h5>
                
                {/* GitHub-style File Upload Area */}
                {isFreelancer && (
                  <div style={{ 
                    border: '2px dashed var(--border-color)',
                    borderRadius: 12,
                    padding: 24,
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-card)',
                    marginBottom: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="file"
                      id={`file-upload-${part.id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && handleFileUpload(part.id, e.target.files[0])}
                      disabled={uploadingFiles[part.id]}
                    />
                    <label htmlFor={`file-upload-${part.id}`} style={{ cursor: 'pointer', margin: 0 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                        fontWeight: 500
                      }}>
                        Drop files here or click to upload
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Maximum file size: 10MB
                      </div>
                    </label>
                  </div>
                )}

                {/* Existing Files */}
                {part.files && part.files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {part.files.map((file) => (
                      <div key={file.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 12,
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            fontSize: '1.2rem',
                            color: 'var(--text-muted)'
                          }}>
                            {file.filename.endsWith('.pdf') ? '📄' : 
                             file.filename.endsWith('.zip') ? '📦' :
                             file.filename.endsWith('.js') || file.filename.endsWith('.jsx') ? '📜' :
                             file.filename.endsWith('.css') ? '🎨' :
                             file.filename.endsWith('.html') ? '🌐' :
                             file.filename.endsWith('.png') || file.filename.endsWith('.jpg') || file.filename.endsWith('.jpeg') ? '🖼️' :
                             '📎'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{file.filename}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <a 
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ textDecoration: 'none' }}
                          >
                            🔗 View
                          </a>
                          {isFreelancer && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleFileDelete(part.id, file.id)}
                              style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}
                    >
                      Submit for Review
                    </button>
                  )}
                  
                  {part.status === 'REVISION_REQUIRED' && (
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}
                    >
                      Resubmit
                    </button>
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
