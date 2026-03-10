import { useState, useEffect } from 'react';
import { getWorkParts, updateWorkPart, uploadWorkFile, getWorkFiles, deleteWorkFile } from '../api/client';
import { StatusBadge } from './UI';

const WorkPartStatus = {
  NOT_STARTED: { color: '#6b7280', label: 'Not Started' },
  IN_PROGRESS: { color: '#3b82f6', label: 'In Progress' },
  SUBMITTED: { color: '#f59e0b', label: 'Submitted' },
  APPROVED: { color: '#10b981', label: 'Approved' },
  REVISION_REQUIRED: { color: '#ef4444', label: 'Revision Required' },
};

export default function ProjectWorkspace({ taskId, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [workParts, setWorkParts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedPart, setExpandedPart] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [newWorkPart, setNewWorkPart] = useState({ title: '', description: '', order: 0 });

  const isClient = user.role === 'CLIENT';
  const isFreelancer = user.role === 'FREELANCER';

  useEffect(() => {
    fetchWorkParts();
    fetchMessages();
    fetchActivity();
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
    }
  };

  const fetchMessages = async () => {
    try {
      // TODO: Implement API call for project messages
      // const res = await getProjectMessages(taskId);
      // setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchActivity = async () => {
    try {
      // TODO: Implement API call for activity log
      // const res = await getActivityLog(taskId);
      // setActivity(res.data);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  const handleStatusUpdate = async (workPartId, status) => {
    try {
      setError('');
      setSuccess('');
      
      await updateWorkPart(workPartId, { status });
      
      // Update local state
      setWorkParts(prev => prev.map(part => 
        part.id === workPartId ? { ...part, status } : part
      ));
      
      setSuccess('Work part status updated successfully');
    } catch (err) {
      console.error('Failed to update work part:', err);
      setError(err.response?.data?.message || 'Failed to update work part');
    }
  };

  const handleFileUpload = async (workPartId, file) => {
    try {
      setError('');
      setSuccess('');
      
      setUploadingFiles(prev => ({ ...prev, [workPartId]: true }));
      
      const formData = new FormData();
      formData.append('file', file);
      
      // TODO: Implement API call for file upload
      // await uploadWorkFile(workPartId, formData);
      
      setSuccess('File uploaded successfully');
      fetchWorkParts(); // Refresh work parts to show new files
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [workPartId]: false }));
    }
  };

  const handleFileDelete = async (workPartId, fileId) => {
    try {
      setError('');
      setSuccess('');
      
      // TODO: Implement API call for file deletion
      // await deleteWorkFile(fileId);
      
      setSuccess('File deleted successfully');
      fetchWorkParts(); // Refresh work parts
    } catch (err) {
      console.error('Failed to delete file:', err);
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setError('');
      
      // TODO: Implement API call for sending message
      // await sendMessage(taskId, newMessage);
      
      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  const handleCreateWorkPart = async (e) => {
    e.preventDefault();
    if (!newWorkPart.title.trim() || !newWorkPart.description.trim()) return;

    try {
      setError('');
      
      // TODO: Implement API call for creating work part
      // await createWorkPart(taskId, newWorkPart);
      
      setNewWorkPart({ title: '', description: '', order: 0 });
      fetchWorkParts(); // Refresh work parts
      setSuccess('Work part created successfully');
    } catch (err) {
      console.error('Failed to create work part:', err);
      setError(err.response?.data?.message || 'Failed to create work part');
    }
  };

  const renderOverview = () => (
    <div>
      <h3 style={{ marginBottom: 24 }}>Project Overview</h3>
      
      {/* Project Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{workParts.length}</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Total Milestones</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
            {workParts.filter(part => part.status === 'APPROVED').length}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Completed</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>
            {workParts.filter(part => part.status === 'IN_PROGRESS').length}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>In Progress</div>
        </div>
      </div>

      {/* Progress Overview */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: 16 }}>Progress Overview</h4>
        {workParts.map((part, index) => (
          <div key={part.id} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 24, 
              height: 24, 
              borderRadius: '50%', 
              backgroundColor: part.status === 'APPROVED' ? 'var(--success)' : 
                             part.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--text-muted)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{part.title}</div>
              <StatusBadge status={part.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMilestones = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3>Milestones</h3>
        {isClient && (
          <button className="btn btn-primary" onClick={() => setActiveTab('create-milestone')}>
            + Add Milestone
          </button>
        )}
      </div>

      {workParts.map((part, index) => (
        <div key={part.id} style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderRadius: 12, 
          border: '1px solid var(--border-color)', 
          marginBottom: 16,
          overflow: 'hidden'
        }}>
          <div 
            style={{ 
              padding: 20, 
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onClick={() => setExpandedPart(expandedPart === part.id ? null : part.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: part.status === 'APPROVED' ? 'var(--success)' : 
                               part.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--text-muted)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              <div>
                <h4 style={{ margin: 0, marginBottom: 4 }}>{part.title}</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{part.description}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={part.status} />
              <span style={{ color: 'var(--text-muted)' }}>
                {expandedPart === part.id ? '▼' : '▶'}
              </span>
            </div>
          </div>

          {expandedPart === part.id && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-color)' }}>
              {/* Freelancer Actions */}
              {isFreelancer && (
                <div style={{ marginBottom: 16 }}>
                  {part.status === 'NOT_STARTED' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate(part.id, 'IN_PROGRESS')}
                      style={{ marginRight: 8 }}
                    >
                      Start Working
                    </button>
                  )}
                  {part.status === 'IN_PROGRESS' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}
                      style={{ marginRight: 8 }}
                    >
                      Submit for Review
                    </button>
                  )}
                </div>
              )}

              {/* Client Actions */}
              {isClient && part.status === 'SUBMITTED' && (
                <div style={{ marginBottom: 16 }}>
                  <button 
                    className="btn btn-success"
                    onClick={() => handleStatusUpdate(part.id, 'APPROVED')}
                    style={{ marginRight: 8 }}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleStatusUpdate(part.id, 'REVISION_REQUIRED')}
                  >
                    Request Revision
                  </button>
                </div>
              )}

              {/* Files Section */}
              <div style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 8 }}>Files</h5>
                {isFreelancer && (
                  <div style={{ 
                    border: '2px dashed var(--border-color)',
                    borderRadius: 12,
                    padding: 24,
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-card)',
                    marginBottom: 16,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      id={`file-upload-${part.id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files[0] && handleFileUpload(part.id, e.target.files[0])}
                      disabled={uploadingFiles[part.id]}
                    />
                    <label htmlFor={`file-upload-${part.id}`} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        {uploadingFiles[part.id] ? 'Uploading...' : 'Click to upload files'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        Supports: PDF, ZIP, Images, Code files
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
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            {file.filename.endsWith('.pdf') ? '📄' : 
                             file.filename.endsWith('.zip') ? '📦' :
                             file.filename.endsWith('.js') || file.filename.endsWith('.jsx') ? '📜' :
                             file.filename.endsWith('.css') ? '🎨' :
                             file.filename.endsWith('.html') ? '🌐' : '📄'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{file.originalName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <a 
                            href={`/api/files/${file.id}`}
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

              {/* Work Content */}
              {part.content && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ marginBottom: 8 }}>Work Update:</h5>
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-primary)'
                  }}>
                    {part.content}
                  </div>
                </div>
              )}

              {/* Client Feedback */}
              {part.feedback && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ marginBottom: 8 }}>Client Feedback:</h5>
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--danger)',
                    color: 'var(--text-primary)'
                  }}>
                    {part.feedback}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderFiles = () => (
    <div>
      <h3 style={{ marginBottom: 24 }}>Project Files</h3>
      
      {/* File Upload Area */}
      {isFreelancer && (
        <div style={{ 
          border: '2px dashed var(--border-color)',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          marginBottom: 32
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📁</div>
          <h4 style={{ marginBottom: 8 }}>Upload Project Files</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Drag and drop files here or click to browse
          </p>
          <button className="btn btn-primary">
            Choose Files
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 16 }}>
            Maximum file size: 10MB. Supported formats: PDF, ZIP, Images, Code files
          </p>
        </div>
      )}

      {/* Files List */}
      <div>
        <h4 style={{ marginBottom: 16 }}>All Files</h4>
        {workParts.flatMap(part => part.files || []).map((file) => (
          <div key={file.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: 16,
            backgroundColor: 'var(--bg-card)',
            borderRadius: 12,
            border: '1px solid var(--border-color)',
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>
                {file.filename.endsWith('.pdf') ? '📄' : 
                 file.filename.endsWith('.zip') ? '📦' :
                 file.filename.endsWith('.js') || file.filename.endsWith('.jsx') ? '📜' :
                 file.filename.endsWith('.css') ? '🎨' :
                 file.filename.endsWith('.html') ? '🌐' : '📄'}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.originalName}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {(file.size / 1024).toFixed(1)} KB • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a 
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                🔗 View
              </a>
              <button className="btn btn-secondary btn-sm">
                ⬇ Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChat = () => (
    <div>
      <h3 style={{ marginBottom: 24 }}>Project Chat</h3>
      
      {/* Chat Messages */}
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderRadius: 12, 
        border: '1px solid var(--border-color)',
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 16
      }}>
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: message.senderId === user.id ? 'flex-end' : 'flex-start',
                  gap: 12
                }}>
                  {message.senderId !== user.id && (
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--accent)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>
                      {message.sender.name?.[0] || 'U'}
                    </div>
                  )}
                  <div style={{ 
                    maxWidth: '70%',
                    backgroundColor: message.senderId === user.id ? 'var(--accent)' : 'var(--bg-card-hover)',
                    color: message.senderId === user.id ? 'white' : 'var(--text-primary)',
                    padding: 12,
                    borderRadius: 12,
                    borderBottomLeftRadius: message.senderId === user.id ? 12 : 4,
                    borderBottomRightRadius: message.senderId === user.id ? 4 : 12
                  }}>
                    <div style={{ fontSize: '0.875rem', marginBottom: 4 }}>
                      {message.sender.name}
                    </div>
                    <div>{message.message}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.7, 
                      marginTop: 4 
                    }}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  {message.senderId === user.id && (
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--accent)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>
                      {user.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ 
            flex: 1,
            padding: 12,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-primary)'
          }}
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );

  const renderActivity = () => (
    <div>
      <h3 style={{ marginBottom: 24 }}>Activity Timeline</h3>
      
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24 }}>
        {activity.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            No activity yet.
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{ 
              position: 'absolute', 
              left: 20, 
              top: 0, 
              bottom: 0, 
              width: 2, 
              backgroundColor: 'var(--border-color)' 
            }} />
            
            {activity.map((item, index) => (
              <div key={item.id} style={{ 
                display: 'flex', 
                gap: 16, 
                marginBottom: 24,
                position: 'relative'
              }}>
                {/* Timeline Dot */}
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: item.action === 'WORK_APPROVED' ? 'var(--success)' :
                                     item.action === 'WORK_SUBMITTED' ? 'var(--warning)' :
                                     item.action === 'REVISION_REQUESTED' ? 'var(--danger)' :
                                     'var(--accent)',
                  border: '2px solid var(--bg-card)',
                  position: 'relative',
                  zIndex: 1
                }} />
                
                {/* Activity Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: 4
                  }}>
                    <div>
                      <strong>{item.actor.name}</strong>
                      <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                        {item.action.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {item.metadata && (
                    <div style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      padding: 8, 
                      borderRadius: 6, 
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {item.metadata.title && <div>Milestone: {item.metadata.title}</div>}
                      {item.metadata.description && <div>{item.metadata.description}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateMilestone = () => (
    <div>
      <h3 style={{ marginBottom: 24 }}>Create New Milestone</h3>
      
      <form onSubmit={handleCreateWorkPart} style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderRadius: 12, 
        border: '1px solid var(--border-color)',
        padding: 24
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Milestone Title
          </label>
          <input
            type="text"
            value={newWorkPart.title}
            onChange={(e) => setNewWorkPart(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., UI Design"
            style={{ 
              width: '100%',
              padding: 12,
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-primary)'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Description
          </label>
          <textarea
            value={newWorkPart.description}
            onChange={(e) => setNewWorkPart(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what needs to be done for this milestone..."
            rows={4}
            style={{ 
              width: '100%',
              padding: 12,
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              resize: 'vertical'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Order
          </label>
          <input
            type="number"
            value={newWorkPart.order}
            onChange={(e) => setNewWorkPart(prev => ({ ...prev, order: parseInt(e.target.value) }))}
            placeholder="Order in sequence (1, 2, 3...)"
            min={1}
            style={{ 
              width: '100%',
              padding: 12,
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-primary)'
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary">
            Create Milestone
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('milestones')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        marginBottom: 24,
        gap: 0
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'milestones', label: 'Milestones' },
          { id: 'files', label: 'Files' },
          { id: 'chat', label: 'Chat' },
          { id: 'activity', label: 'Activity' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              backgroundColor: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: activeTab === tab.id ? 600 : 400
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'milestones' && renderMilestones()}
        {activeTab === 'files' && renderFiles()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'create-milestone' && renderCreateMilestone()}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div style={{ 
          position: 'fixed', 
          top: 20, 
          right: 20, 
          backgroundColor: 'var(--danger)', 
          color: 'white', 
          padding: 16, 
          borderRadius: 8,
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          position: 'fixed', 
          top: 20, 
          right: 20, 
          backgroundColor: 'var(--success)', 
          color: 'white', 
          padding: 16, 
          borderRadius: 8,
          zIndex: 1000
        }}>
          {success}
        </div>
      )}
    </div>
  );
}
