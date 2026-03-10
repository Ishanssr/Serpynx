import { useState, useEffect } from 'react';
import { getAssignedTasks } from '../api/client';
import { StatusBadge } from './UI';
import ProjectWorkspace from './ProjectWorkspace';

export default function FreelancerDashboard() {
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignedTasks();
  }, []);

  const fetchAssignedTasks = async () => {
    try {
      console.log('Fetching assigned tasks...');
      const res = await getMyBids();
      console.log('Full response:', res);
      console.log('Response data:', res.data);
      console.log('Response type:', typeof res.data);
      console.log('Is data array?', Array.isArray(res.data));
      
      // Ensure we have an array - handle different response structures
      let bidsData = [];
      if (Array.isArray(res.data)) {
        bidsData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        // Handle nested data structure
        bidsData = res.data.data;
      } else if (res.data && res.data.bids && Array.isArray(res.data.bids)) {
        // Handle bids wrapper
        bidsData = res.data.bids;
      } else {
        console.warn('Unexpected response structure:', res.data);
        bidsData = [];
      }
      
      console.log('Processed bids data:', bidsData);
      
      const tasks = bidsData
        .filter(bid => {
          console.log('Checking bid:', bid.id, 'status:', bid.status, 'task status:', bid.task?.status);
          console.log('Task object:', bid.task);
          
          // Check if bid is accepted AND task exists
          if (bid.status !== 'ACCEPTED') {
            console.log('Bid not accepted, skipping');
            return false;
          }
          
          if (!bid.task) {
            console.log('No task object, skipping');
            return false;
          }
          
          // Check task status - be more flexible
          const validTaskStatuses = ['ASSIGNED', 'IN_REVIEW', 'COMPLETED', 'OPEN'];
          const isValidStatus = validTaskStatuses.includes(bid.task.status);
          console.log('Task status valid:', isValidStatus, 'for status:', bid.task.status);
          
          return isValidStatus;
        })
        .map(bid => ({
          ...bid.task,
          bidAmount: bid.amount,
          bidEstimatedDays: bid.estimatedDays
        }));
      
      console.log('Filtered tasks:', tasks);
      setAssignedTasks(tasks);
      
      if (tasks.length === 0) {
        setError('No assigned tasks found. Check console for details. Make sure you have accepted bids and tasks have been assigned.');
      }
    } catch (err) {
      console.error('Error fetching assigned tasks:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch assigned tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const activeTasks = assignedTasks.filter(task => 
    task.status === 'ASSIGNED' || task.status === 'IN_REVIEW'
  );
  const completedTasks = assignedTasks.filter(task => task.status === 'COMPLETED');

  return (
    <div>
      <h1>My Work Dashboard</h1>
      
      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Active Projects</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{activeTasks.length}</div>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#10b981' }}>Completed Projects</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{completedTasks.length}</div>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>Total Earnings</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${completedTasks.reduce((sum, task) => sum + (task.bidAmount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Task Selection */}
      {assignedTasks.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Select Project to Manage</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {assignedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                style={{
                  padding: 16,
                  border: selectedTask?.id === task.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  backgroundColor: selectedTask?.id === task.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedTask?.id === task.id ? '0 0 0 1px rgba(59,130,246,0.4)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, marginBottom: 4 }}>{task.title}</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Client: {task.client?.name || 'Unknown'} • {task.bidEstimatedDays} days
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={task.status} />
                    <div style={{ marginTop: 4, fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981' }}>
                      ${task.bidAmount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3>No Assigned Projects</h3>
          <p>You don't have any assigned projects yet. Keep bidding on tasks to get work!</p>
        </div>
      )}

      {/* Work Management for Selected Task */}
      {selectedTask && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>
            Managing: {selectedTask.title}
          </h2>
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Project Details</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{selectedTask.description}</p>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong>Budget:</strong> ${selectedTask.bidAmount} • 
              <strong> Estimated:</strong> {selectedTask.bidEstimatedDays} days • 
              <strong> Client:</strong> {selectedTask.client?.name}
            </div>
          </div>
          <ProjectWorkspace taskId={selectedTask.id} user={{ role: 'FREELANCER' }} />
        </div>
      )}
    </div>
  );
}
