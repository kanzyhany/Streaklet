import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authService.register({ name, email, password });
            if (res.success) {
                navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
            }
        } catch (err) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-card card" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="auth-header text-center" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-green)', marginBottom: 'var(--space-md)' }}>
                        <span className="logo-icon">🌿</span>
                        <span>Streaklet</span>
                    </div>
                    <h1>Join Streaklet</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Start your journey to better habits today</p>
                </div>

                {error && (
                    <div className="status-badge missed" style={{ width: '100%', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)' }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Full Name</label>
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Email Address</label>
                        <input
                            type="email"
                            className="form-input w-full"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Password</label>
                        <input
                            type="password"
                            className="form-input w-full"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="6"
                            style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '1rem' }}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer text-center" style={{ marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-green)', fontWeight: '600' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
