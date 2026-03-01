import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api/client';

export default function CreateTask() {
    const [form, setForm] = useState({ title: '', description: '', budget: '', requiredSkills: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const skills = form.requiredSkills ? form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];
            const res = await createTask({
                title: form.title,
                description: form.description,
                budget: Number(form.budget),
                requiredSkills: skills,
            });
            navigate(`/tasks/${res.data.id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Post a New Task</h1>
                    <p>Describe your project and let the best developers find you</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 640 }}>
                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Task Title</label>
                        <input className="form-input" value={form.title} onChange={update('title')} required
                            placeholder="Build a REST API for e-commerce platform" />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-textarea" value={form.description} onChange={update('description')} required
                            placeholder="Describe the task in detail. What are the requirements, deliverables, and timeline expectations?" rows={6} />
                    </div>

                    <div className="form-group">
                        <label>Budget ($)</label>
                        <input className="form-input" type="number" value={form.budget} onChange={update('budget')} required min={1}
                            placeholder="500" />
                    </div>

                    <div className="form-group">
                        <label>Required Skills (comma separated)</label>
                        <input className="form-input" value={form.requiredSkills} onChange={update('requiredSkills')}
                            placeholder="React, Node.js, PostgreSQL" />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            {loading ? 'Creating...' : '🚀 Post Task'}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => navigate('/dashboard')}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
