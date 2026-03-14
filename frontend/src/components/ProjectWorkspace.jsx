import { useState, useEffect, useRef } from 'react';
import { getWorkParts, updateWorkPart, reviewWorkPart, uploadWorkFile, deleteWorkFile } from '../api/client';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedPart, setExpandedPart] = useState(null);
  const [noteText, setNoteText] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [discussionNotes, setDiscussionNotes] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState('');
  const successTimer = useRef(null);

  const isClient = user.role === 'CLIENT';
  const isFreelancer = user.role === 'FREELANCER';

  useEffect(() => { fetchWorkParts(); }, [taskId]);
  useEffect(() => {
    if (success) {
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(''), 3000);
    }
  }, [success]);

  // Load discussion notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`project-notes-${taskId}`);
      if (saved) setDiscussionNotes(JSON.parse(saved));
    } catch(e) {}
  }, [taskId]);

  const saveDiscussionNotes = (notes) => {
    setDiscussionNotes(notes);
    localStorage.setItem(`project-notes-${taskId}`, JSON.stringify(notes));
  };

  const fetchWorkParts = async () => {
    try {
      const res = await getWorkParts(taskId);
      const parts = Array.isArray(res.data) ? res.data : [];
      // Transform WorkFile relation to files array
      setWorkParts(parts.map(p => ({
        ...p,
        files: (p.WorkFile || []).map(f => ({
          ...f,
          uploader: f.User,
          url: `/uploads/work-files/${f.filename}`,
        })),
      })));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch work parts');
      setWorkParts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (workPartId, status) => {
    try {
      setError('');
      await updateWorkPart(workPartId, { status });
      setWorkParts(prev => prev.map(p =>
        p.id === workPartId ? { ...p, status, ...(status === 'SUBMITTED' ? { submittedAt: new Date().toISOString() } : {}) } : p
      ));
      setSuccess(`Milestone ${status === 'IN_PROGRESS' ? 'started' : status === 'SUBMITTED' ? 'submitted for review' : 'updated'}!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSubmitContent = async (workPartId) => {
    const content = noteText[workPartId];
    if (!content?.trim()) return;
    try {
      setError('');
      await updateWorkPart(workPartId, { content });
      setWorkParts(prev => prev.map(p => p.id === workPartId ? { ...p, content } : p));
      setNoteText(prev => ({ ...prev, [workPartId]: '' }));
      setSuccess('Work update saved!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save update');
    }
  };

  const handleReview = async (workPartId, status, feedback = '') => {
    try {
      setError('');
      await reviewWorkPart(workPartId, { status, feedback });
      setWorkParts(prev => prev.map(p =>
        p.id === workPartId ? { ...p, status, feedback: feedback || p.feedback, reviewedAt: new Date().toISOString() } : p
      ));
      setSuccess(status === 'APPROVED' ? 'Milestone approved!' : 'Revision requested!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleFileUpload = async (workPartId, file) => {
    try {
      setError('');
      setUploadingFiles(prev => ({ ...prev, [workPartId]: true }));
      const res = await uploadWorkFile(workPartId, file);
      const newFile = {
        ...res.data,
        url: `/uploads/work-files/${res.data.filename}`,
        uploader: { name: user.name || 'You' },
      };
      setWorkParts(prev => prev.map(p =>
        p.id === workPartId ? { ...p, files: [newFile, ...(p.files || [])] } : p
      ));
      setSuccess(`File "${file.name}" uploaded!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [workPartId]: false }));
    }
  };

  const handleFileDelete = async (workPartId, fileId) => {
    if (!confirm('Delete this file?')) return;
    try {
      setError('');
      await deleteWorkFile(workPartId, fileId);
      setWorkParts(prev => prev.map(p =>
        p.id === workPartId ? { ...p, files: (p.files || []).filter(f => f.id !== fileId) } : p
      ));
      setSuccess('File deleted!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleSendDiscussion = (e) => {
    e.preventDefault();
    if (!newDiscussion.trim()) return;
    const note = {
      id: Date.now().toString(),
      text: newDiscussion,
      sender: user.name || (isClient ? 'Client' : 'Freelancer'),
      senderId: user.id,
      role: user.role,
      createdAt: new Date().toISOString(),
    };
    saveDiscussionNotes([...discussionNotes, note]);
    setNewDiscussion('');
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading milestones...</div>;

  const completedParts = workParts.filter(p => p.status === 'APPROVED').length;
  const totalParts = workParts.length;
  const progressPct = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

  if (workParts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
        <h3>No milestones yet</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Milestones will appear once the task assignment is fully processed.</p>
        <button className="btn btn-primary" onClick={fetchWorkParts} style={{ marginTop: 12 }}>Refresh</button>
      </div>
    );
  }

  const getFileIcon = (name) => {
    if (!name) return '📄';
    const ext = name.split('.').pop()?.toLowerCase();
    const icons = { pdf: '📄', zip: '📦', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', mp4: '🎥', js: '📜', jsx: '📜', ts: '📜', css: '🎨', html: '🌐', txt: '📝' };
    return icons[ext] || '📎';
  };

  // ─── FILES SECTION (rendered inside each milestone) ───
  const renderFilesForPart = (part) => (
    <div style={{ marginTop: 12 }}>
      <h5 style={{ marginBottom: 8, fontSize: '0.85rem' }}>📁 Files ({(part.files || []).length})</h5>

      {/* Upload Area */}
      {(isFreelancer || isClient) && (
        <div style={{
          border: '2px dashed var(--border-color)', borderRadius: 10, padding: 16,
          textAlign: 'center', backgroundColor: 'var(--bg-secondary)', marginBottom: 10,
          cursor: uploadingFiles[part.id] ? 'wait' : 'pointer', transition: 'border-color 0.2s',
        }}>
          <input
            type="file"
            id={`file-${part.id}`}
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleFileUpload(part.id, e.target.files[0])}
            disabled={uploadingFiles[part.id]}
          />
          <label htmlFor={`file-${part.id}`} style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{uploadingFiles[part.id] ? '⏳' : '📤'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {uploadingFiles[part.id] ? 'Uploading...' : 'Click to upload files (proof of work, deliverables)'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Images, PDF, ZIP, Code files — Max 50MB
            </div>
          </label>
        </div>
      )}

      {/* File List */}
      {(part.files || []).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {part.files.map(file => (
            <div key={file.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10,
              backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>{getFileIcon(file.originalName || file.filename)}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{file.originalName || file.filename}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB
                    {file.uploader?.name ? ` • by ${file.uploader.name}` : ''}
                    {file.uploadedAt ? ` • ${new Date(file.uploadedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={file.url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '0.75rem' }}>
                  View
                </a>
                {file.uploaderId === user.id && (
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => handleFileDelete(part.id, file.id)}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── OVERVIEW ───
  const renderOverview = () => (
    <div>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{progressPct}%</span>
        </div>
        <div style={{ height: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, backgroundColor: 'var(--success)', borderRadius: 5, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>{completedParts} of {totalParts} completed</span>
          <span>{workParts.filter(p => p.status === 'SUBMITTED').length} awaiting review</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total', value: totalParts, color: 'var(--accent)', icon: '📋' },
          { label: 'Completed', value: completedParts, color: 'var(--success)', icon: '✅' },
          { label: 'In Progress', value: workParts.filter(p => p.status === 'IN_PROGRESS').length, color: 'var(--warning)', icon: '🔄' },
          { label: 'Review', value: workParts.filter(p => p.status === 'SUBMITTED').length, color: '#f59e0b', icon: '⏳' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-card)', padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: 14 }}>Milestone Timeline</h4>
        {workParts.map((part, i) => {
          const si = WorkPartStatus[part.status] || WorkPartStatus.NOT_STARTED;
          return (
            <div key={part.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < workParts.length - 1 ? 14 : 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: si.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{part.title}</div>
                <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, backgroundColor: si.color + '20', color: si.color }}>{si.label}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(part.files || []).length} files</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── MILESTONES ───
  const renderMilestones = () => (
    <div>
      <h3 style={{ marginBottom: 16 }}>Milestones ({totalParts})</h3>
      {workParts.map((part, i) => {
        const si = WorkPartStatus[part.status] || WorkPartStatus.NOT_STARTED;
        const isExp = expandedPart === part.id;
        return (
          <div key={part.id} style={{
            backgroundColor: 'var(--bg-card)', borderRadius: 12,
            border: isExp ? '1px solid var(--accent)' : '1px solid var(--border-color)',
            marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.2s',
          }}>
            <div style={{ padding: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setExpandedPart(isExp ? null : part.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: si.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{part.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{part.description}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(part.files || []).length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📎 {part.files.length}</span>}
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, backgroundColor: si.color + '20', color: si.color }}>{si.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{isExp ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExp && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-color)' }}>
                {/* Freelancer Actions */}
                {isFreelancer && (
                  <div style={{ marginTop: 10 }}>
                    {part.status === 'NOT_STARTED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(part.id, 'IN_PROGRESS')}>🚀 Start Working</button>
                    )}
                    {(part.status === 'IN_PROGRESS' || part.status === 'REVISION_REQUIRED') && (
                      <div>
                        <textarea
                          value={noteText[part.id] || ''}
                          onChange={e => setNoteText(prev => ({ ...prev, [part.id]: e.target.value }))}
                          placeholder="Add a work update or description of what you've done..."
                          rows={3}
                          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.83rem', marginBottom: 6 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleSubmitContent(part.id)}>💾 Save Update</button>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')}>📤 Submit for Review</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Client Actions */}
                {isClient && part.status === 'SUBMITTED' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleReview(part.id, 'APPROVED')}>✅ Approve</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      const fb = prompt('Enter feedback for the freelancer:');
                      if (fb) handleReview(part.id, 'REVISION_REQUIRED', fb);
                    }}>🔄 Request Revision</button>
                  </div>
                )}

                {/* Work Content */}
                {part.content && (
                  <div style={{ marginTop: 12 }}>
                    <h5 style={{ marginBottom: 6, fontSize: '0.83rem' }}>📝 Freelancer Update:</h5>
                    <div style={{ padding: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontSize: '0.83rem', lineHeight: 1.5 }}>{part.content}</div>
                  </div>
                )}

                {/* Client Feedback */}
                {part.feedback && (
                  <div style={{ marginTop: 10 }}>
                    <h5 style={{ marginBottom: 6, fontSize: '0.83rem' }}>💬 Client Feedback:</h5>
                    <div style={{ padding: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', borderLeft: '4px solid var(--danger)', whiteSpace: 'pre-wrap', fontSize: '0.83rem' }}>{part.feedback}</div>
                  </div>
                )}

                {/* FILE UPLOADS */}
                {renderFilesForPart(part)}

                {/* Timestamps */}
                <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                  {part.submittedAt && <span>Submitted: {new Date(part.submittedAt).toLocaleDateString()}</span>}
                  {part.reviewedAt && <span>Reviewed: {new Date(part.reviewedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── DISCUSSION ───
  const renderDiscussion = () => (
    <div>
      <h3 style={{ marginBottom: 16 }}>Project Discussion</h3>
      <div style={{
        backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)',
        height: 400, display: 'flex', flexDirection: 'column',
      }}>
        {/* Messages */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {discussionNotes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
              No messages yet. Start the conversation about this project!
            </div>
          ) : (
            discussionNotes.map(note => {
              const isMine = note.senderId === user.id;
              return (
                <div key={note.id} style={{ marginBottom: 12, display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: 10, borderRadius: 12,
                    backgroundColor: isMine ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    borderBottomLeftRadius: isMine ? 12 : 4,
                    borderBottomRightRadius: isMine ? 4 : 12,
                  }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: 3, fontWeight: 600 }}>
                      {note.sender} • {note.role === 'CLIENT' ? '👤 Client' : '💻 Freelancer'}
                    </div>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{note.text}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 3 }}>
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendDiscussion} style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          <input
            type="text"
            value={newDiscussion}
            onChange={e => setNewDiscussion(e.target.value)}
            placeholder="Type your message..."
            style={{ flex: 1, padding: 10, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Send</button>
        </form>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
        💡 Discussion notes are stored locally. Both client and freelancer can see notes they add.
      </p>
    </div>
  );

  // ─── ACTIVITY ───
  const renderActivity = () => {
    const activities = workParts.flatMap(part => {
      const items = [];
      items.push({ date: part.createdAt, action: 'Milestone created', detail: part.title, icon: '📋' });
      if (['IN_PROGRESS', 'SUBMITTED', 'APPROVED'].includes(part.status)) {
        items.push({ date: part.updatedAt, action: 'Work started', detail: part.title, icon: '🚀' });
      }
      if (part.submittedAt) items.push({ date: part.submittedAt, action: 'Submitted for review', detail: part.title, icon: '📤' });
      if (part.reviewedAt) items.push({
        date: part.reviewedAt,
        action: part.status === 'APPROVED' ? 'Approved' : 'Revision requested',
        detail: part.title,
        icon: part.status === 'APPROVED' ? '✅' : '🔄',
      });
      (part.files || []).forEach(f => {
        items.push({ date: f.uploadedAt, action: 'File uploaded', detail: `${f.originalName || f.filename} → ${part.title}`, icon: '📎' });
      });
      return items;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div>
        <h3 style={{ marginBottom: 16 }}>Activity Timeline</h3>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No activity yet.</div>
          ) : activities.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < activities.length - 1 ? 14 : 0, paddingBottom: i < activities.length - 1 ? 14 : 0, borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{item.action}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.detail}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(item.date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'milestones', label: '🎯 Milestones' },
          { id: 'discussion', label: '💬 Discussion' },
          { id: 'activity', label: '📜 Activity' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 18px', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === tab.id ? 600 : 400, transition: 'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'milestones' && renderMilestones()}
      {activeTab === 'discussion' && renderDiscussion()}
      {activeTab === 'activity' && renderActivity()}

      {/* Toast */}
      {error && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, backgroundColor: 'var(--danger)', color: 'white', padding: '12px 20px', borderRadius: 10, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ❌ {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, backgroundColor: 'var(--success)', color: 'white', padding: '12px 20px', borderRadius: 10, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}
