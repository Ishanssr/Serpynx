import { useState, useEffect } from 'react';
import { getMyTasks } from '../api/client';
import { StatusBadge, Loading } from './UI';
import ProjectWorkspace from './ProjectWorkspace';

export default function ClientDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      console.log('Fetching client tasks...');
      const res = await getMyTasks();
      console.log('Tasks response:', res.data);
      
      const tasks = res.data.filter(task => task.status === 'ASSIGNED' || task.status === 'IN_REVIEW' || task.status === 'COMPLETED');
      console.log('Filtered tasks:', tasks);
      setTasks(tasks);
      
      if (tasks.length === 0) {
        setError('No active projects found. Tasks will appear here once assigned to freelancers.');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const activeTasks = tasks.filter(task => 
    task.status === 'ASSIGNED' || task.status === 'IN_REVIEW'
  );
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');

  return (
    <div>
      <h1>Work Progress Dashboard</h1>
      
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
          <h3 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>Total Projects</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasks.length}</div>
        </div>
      </div>

      {/* Task Selection */}
      {tasks.length > 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Select Project to View Progress</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {tasks.map((task) => (
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
                      Assigned to: {task.assignedTo?.name || 'Unknown'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={task.status} />
                    <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ${task.budget}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3>No Active Projects</h3>
          <p>You don't have any projects with work in progress yet.</p>
        </div>
      )}

      {/* Work Progress for Selected Task */}
      {selectedTask && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>
            Progress for: {selectedTask.title}
          </h2>
          <ProjectWorkspace taskId={selectedTask.id} user={{ role: 'CLIENT' }} />
        </div>
      )}
    </div>
  );
}
