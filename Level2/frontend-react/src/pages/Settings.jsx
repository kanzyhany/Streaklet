import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const Settings = () => {
    const { user, setUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authService.updateProfile({ name, timezone });
            if (res.success) {
                setUser(res.data);
                setMessage('Profile updated successfully! ✨');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="page-greeting">
                <h1>Settings</h1>
                <p>Manage your account and preferences</p>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSave}>
                    <div className="settings-section">
                        <h3 className="section-title">General Settings</h3>
                        {message && <div className="status-badge done" style={{ width: '100%', marginBottom: '10px' }}>{message}</div>}

                        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="form-label">Email Address (Read-only)</label>
                            <input
                                type="email"
                                className="form-input w-full"
                                value={user?.email}
                                disabled
                                style={{ background: 'var(--bg-cream-dark)', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                            <label className="form-label">Timezone</label>
                            <select className="form-input w-full" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                <option value="UTC">UTC (Universal Time)</option>
                                <option value="GMT">GMT (Greenwich Mean Time)</option>
                                <option value="EST">EST (Eastern Standard Time)</option>
                                <option value="PST">PST (Pacific Standard Time)</option>
                                <option value="Asia/Cairo">Africa/Cairo (EET)</option>
                            </select>
                        </div>
                    </div>

                    <div className="settings-section mt-xl">
                        <h3 className="section-title">Theme Preferences</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Dark mode is coming soon in Level 3! 🌙</p>
                    </div>

                    <button type="submit" className="btn btn-primary mt-xl" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;
