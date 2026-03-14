import { useState, useEffect, useRef } from 'react';
import { getWorkParts, updateWorkPart, reviewWorkPart } from '../api/client';
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
  const successTimer = useRef(null);

  const isClient = user.role === 'CLIENT';
  const isFreelancer = user.role === 'FREELANCER';

  useEffect(() => {
    fetchWorkParts();
  }, [taskId]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(''), 3000);
    }
  }, [success]);

  const fetchWorkParts = async () => {
    try {
      const res = await getWorkParts(taskId);
      setWorkParts(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch work parts:', err);
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
      setWorkParts(prev => prev.map(p =>
        p.id === workPartId ? { ...p, content } : p
      ));
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

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading work parts...</div>;

  const completedParts = workParts.filter(p => p.status === 'APPROVED').length;
  const totalParts = workParts.length;
  const progressPct = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

  if (workParts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
        <h3>No milestones yet</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Milestones will appear once the task assignment is fully processed.
        </p>
        <button className="btn btn-primary" onClick={fetchWorkParts} style={{ marginTop: 12 }}>
          Refresh
        </button>
      </div>
    );
  }

  const renderOverview = () => (
    <div>
      {/* Progress Bar */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Overall Progress</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{progressPct}%</span>
        </div>
        <div style={{ height: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, backgroundColor: 'var(--success)', borderRadius: 5, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>{completedParts} of {totalParts} milestones completed</span>
          <span>{workParts.filter(p => p.status === 'IN_PROGRESS').length} in progress</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: totalParts, color: 'var(--accent)', icon: '📋' },
          { label: 'Completed', value: completedParts, color: 'var(--success)', icon: '✅' },
          { label: 'In Progress', value: workParts.filter(p => p.status === 'IN_PROGRESS').length, color: 'var(--warning)', icon: '🔄' },
          { label: 'Awaiting Review', value: workParts.filter(p => p.status === 'SUBMITTED').length, color: '#f59e0b', icon: '⏳' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: 16 }}>Milestone Timeline</h4>
        {workParts.map((part, i) => {
          const statusInfo = WorkPartStatus[part.status] || WorkPartStatus.NOT_STARTED;
          return (
            <div key={part.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < workParts.length - 1 ? 16 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: statusInfo.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{part.title}</div>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: statusInfo.color + '20', color: statusInfo.color,
                }}>{statusInfo.label}</span>
              </div>
              {i < workParts.length - 1 && (
                <div style={{ position: 'absolute', left: 37, width: 2, height: 16, backgroundColor: 'var(--border-color)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMilestones = () => (
    <div>
      <h3 style={{ marginBottom: 20 }}>Milestones ({totalParts})</h3>
      {workParts.map((part, i) => {
        const statusInfo = WorkPartStatus[part.status] || WorkPartStatus.NOT_STARTED;
        const isExpanded = expandedPart === part.id;

        return (
          <div key={part.id} style={{
            backgroundColor: 'var(--bg-card)', borderRadius: 12,
            border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border-color)',
            marginBottom: 12, overflow: 'hidden', transition: 'border-color 0.2s',
          }}>
            {/* Header */}
            <div
              style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setExpandedPart(isExpanded ? null : part.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', backgroundColor: statusInfo.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.85rem',
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{part.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{part.description}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                  backgroundColor: statusInfo.color + '20', color: statusInfo.color,
                }}>{statusInfo.label}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{isExpanded ? '▼' : '▶'}</span>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                {/* Freelancer Actions */}
                {isFreelancer && (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    {part.status === 'NOT_STARTED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(part.id, 'IN_PROGRESS')}>
                        🚀 Start Working
                      </button>
                    )}
                    {(part.status === 'IN_PROGRESS' || part.status === 'REVISION_REQUIRED') && (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <textarea
                            value={noteText[part.id] || ''}
                            onChange={e => setNoteText(prev => ({ ...prev, [part.id]: e.target.value }))}
                            placeholder="Add a work update or note about your progress..."
                            rows={3}
                            style={{
                              width: '100%', padding: 10, borderRadius: 8,
                              border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.85rem',
                            }}
                          />
                          <button className="btn btn-secondary btn-sm" onClick={() => handleSubmitContent(part.id)} style={{ marginTop: 6 }}>
                            💾 Save Update
                          </button>
                        </div>
                        <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(part.id, 'SUBMITTED')} style={{ marginTop: 4 }}>
                          📤 Submit for Review
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Client Actions */}
                {isClient && part.status === 'SUBMITTED' && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleReview(part.id, 'APPROVED')}>
                      ✅ Approve
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      const feedback = prompt('Enter feedback for the freelancer:');
                      if (feedback) handleReview(part.id, 'REVISION_REQUIRED', feedback);
                    }}>
                      🔄 Request Revision
                    </button>
                  </div>
                )}

                {/* Work Content */}
                {part.content && (
                  <div style={{ marginTop: 12 }}>
                    <h5 style={{ marginBottom: 6, fontSize: '0.85rem' }}>📝 Freelancer Update:</h5>
                    <div style={{
                      padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 8,
                      border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap',
                      fontSize: '0.85rem', lineHeight: 1.5,
                    }}>{part.content}</div>
                  </div>
                )}

                {/* Client Feedback */}
                {part.feedback && (
                  <div style={{ marginTop: 12 }}>
                    <h5 style={{ marginBottom: 6, fontSize: '0.85rem' }}>💬 Client Feedback:</h5>
                    <div style={{
                      padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 8,
                      border: '1px solid var(--border-color)', borderLeft: '4px solid var(--danger)',
                      whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.5,
                    }}>{part.feedback}</div>
                  </div>
                )}

                {/* Timestamps */}
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
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

  const renderActivity = () => {
    // Build activity from work parts data
    const activities = workParts.flatMap(part => {
      const items = [];
      items.push({ date: part.createdAt, action: 'Milestone created', detail: part.title, icon: '📋' });
      if (part.status === 'IN_PROGRESS' || part.status === 'SUBMITTED' || part.status === 'APPROVED') {
        items.push({ date: part.updatedAt, action: 'Work started', detail: part.title, icon: '🚀' });
      }
      if (part.submittedAt) {
        items.push({ date: part.submittedAt, action: 'Submitted for review', detail: part.title, icon: '📤' });
      }
      if (part.reviewedAt) {
        items.push({
          date: part.reviewedAt,
          action: part.status === 'APPROVED' ? 'Approved' : 'Revision requested',
          detail: part.title,
          icon: part.status === 'APPROVED' ? '✅' : '🔄',
        });
      }
      return items;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div>
        <h3 style={{ marginBottom: 20 }}>Activity Timeline</h3>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: 20 }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No activity yet.</div>
          ) : (
            activities.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < activities.length - 1 ? 16 : 0, paddingBottom: i < activities.length - 1 ? 16 : 0, borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.action}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'milestones', label: '🎯 Milestones' },
          { id: 'activity', label: '📜 Activity' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400, transition: 'all 0.2s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'milestones' && renderMilestones()}
      {activeTab === 'activity' && renderActivity()}

      {/* Toast Messages */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, backgroundColor: 'var(--danger)', color: 'white',
          padding: '12px 20px', borderRadius: 10, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          ❌ {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
      )}
      {success && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, backgroundColor: 'var(--success)', color: 'white',
          padding: '12px 20px', borderRadius: 10, zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}
